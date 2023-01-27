import ConfirmOrderService from './confirmOrder.service.js';
import { isSignatureValid } from '../../../shared/utils/cryptic.js';
import messages from '../../../shared/utils/messages.js';
import { produceKafkaEvent, kafkaClusters } from '../../../shared/eda/kafka.js'
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js';
import {v4 as uuidv4} from 'uuid';
import CustomLogs from '../../../shared/utils/customLogs.js';
import { PROTOCOL_CONTEXT, SUBSCRIBER_TYPE } from '../../../shared/utils/constants.js';
import { getSubscriberType } from '../../../shared/utils/registryApis/registryUtil.js';
import {CreateBppOrder, GetBppOrder} from '../../../shared/db/bpp_dbService.js';
import { getBPPCartByTransactionId, getProductById } from '../../../shared/db/dbService.js';

/*
 Copyright (C) 2022 Eunimart Omnichannel Pvt Ltd. (www.eunimart.com)
 All rights reserved.
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License v3.0 as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License v3.0 for more details.
 You should have received a copy of the GNU Lesser General Public License v3.0
 along with this program.  If not, see <https://www.gnu.org/licenses/lgpl-3.0.html/>.
*/
const confirmOrderService = new ConfirmOrderService();
class ConfirmOrderController {

    /**
    * confirm order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async bppConfirmOrder(req, res, next) {
        var proxy_auth = ""

        if(req.body.context.bpp_id == process.env.BPP_ID) {
            proxy_auth = req.headers["authorization"]?.toString() || "";
        }
        
        // const orderDetails = await getOrderByTransactionId(req.body.context?.transaction_id);

        // if (!orderDetails){
        //     return res.status(401)
        //         .setHeader('Proxy-Authenticate', proxy_auth)
        //         .json({ message : { 
        //                 "ack": { "status": "NACK" },  
        //                 "error": { "type": "BAP", "code": "10001", "message": "No order present" } } 
        //             })
        // }

        CustomLogs.writeRetailLogsToONDC(JSON.stringify(req.body), PROTOCOL_CONTEXT.CONFIRM,getSubscriberType(SUBSCRIBER_TYPE.BPP))

        isSignatureValid(proxy_auth, req.body).then(async(isValid) => {
            isValid=true
            if(!isValid) {
                return res.status(401)
                .setHeader('Proxy-Authenticate', proxy_auth)
                .json({ message : { 
                        "ack": { "status": "NACK" },  
                        "error": { "type": "BAP", "code": "10001", "message": "Invalid Signature" } } 
                    })
            } else {

                let response = req.body;

                let cartDetails= await getBPPCartByTransactionId(response.context?.transaction_id)

                var is_all_cod_available = false

                if (response?.message?.order?.items.length > 0){
                    is_all_cod_available = true
                }

                for (var item_id of response?.message?.order?.items){
                    var product = await getProductById(item_id?.id)
                    if (!product?.["@ondc/org/available_on_cod"]){
                        is_all_cod_available = false
                        break
                    }
                }

                if (!is_all_cod_available && response?.message?.order?.payment?.type == "POST-FULFILLMENT"){
                    return res.status(401).send(messages.getNackResponse(req.body.context))
                }

                var data = {
                    "meta_data": {
                        "access_template_id": 1,
                        "token_user_id": 1,
                        "company_id": 1,
                        "request_id":String(uuidv4()),
                        "encryption": false
                    },
                    "data": response
                }
                var order={}
                order["transactionId"] = response.context.transaction_id
                order["id"] = response.message?.order?.id
                order["billing"] = response?.message?.order?.billing
                order["items"] = response?.message?.order?.items
                order["state"] = response?.message?.order?.state
                order["fulfillments"] = cartDetails?.onselect?.message?.order?.fulfillments,
                order["provider"] = response?.message?.order?.items?.provider
                order["payment"] = response?.message?.order?.payment
                order["context"] = response?.context
                order["quote"] = response?.message?.order?.quote
                await CreateBppOrder(order)
                req.body.message.order["fulfillments"] = cartDetails?.onselect?.message?.order?.fulfillments
                produceKafkaEvent(kafkaClusters.Tech, topics.SALES_ORDER_CREATE, data).catch(console.error)

                res.status(200).send(messages.getAckResponse(req.body.context));
                const end_point = req.body.context.bap_uri;
                confirmOrderService.bppOnConfirmOrderResponse(end_point, req.body);
            }
        })
    }
}

export default ConfirmOrderController;
