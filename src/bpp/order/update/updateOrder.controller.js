import UpdateOrderService from './updateOrder.service.js';
import BadRequestParameterError from '../../../shared/lib/errors/bad-request-parameter.error.js';
import { isSignatureValid } from '../../../shared/utils/cryptic.js';
import messages from '../../../shared/utils/messages.js';
import { getOrderById, getOrderByTransactionId, getProductById } from '../../../shared/db/dbService.js';
import CustomLogs from '../../../shared/utils/customLogs.js';
import { PROTOCOL_CONTEXT, SUBSCRIBER_TYPE } from '../../../shared/utils/constants.js';
import { getSubscriberType } from '../../../shared/utils/registryApis/registryUtil.js';
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js';
import { v4 as uuidv4 } from 'uuid';
import { kafkaClusters, produceKafkaEvent } from "../../../shared/eda/kafka.js";
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
const updateOrderService = new UpdateOrderService();

class UpdateOrderController {

    /**
    * Update order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    updateOrder(req, res, next) {
        const { body: orderRequest } = req;

        updateOrderService.updateOrder(orderRequest).then(response => {
            res.json({ ...response });
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * Update order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    ONDCUpdateOrder(req, res, next) {
        const { body: orderRequest } = req;

        updateOrderService.ONDCUpdateOrder(orderRequest).then(response => {
            res.json({ ...response });
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * bpp Update Order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async bppUpdateOrder(req, res, next) {
        var proxy_auth = ""

        if (req.body.context.bpp_id == process.env.BPP_ID) {
            proxy_auth = req.headers["authorization"]?.toString() || "";
        }

        CustomLogs.writeRetailLogsToONDC(JSON.stringify(req.body), PROTOCOL_CONTEXT.UPDATE, getSubscriberType(SUBSCRIBER_TYPE.BPP))
        let flag=true;
        req?.body?.message?.order?.items.forEach(async(item) => {
            if (item?.tags?.update_type == "cancel") {
                let product = await getProductById(item?.id)
                if (product?.['@ondc/org/cancellable']!= "true"||product?.['@ondc/org/cancellable']!= true) {
                    flag=false
                }
            }
            if (item?.tags?.update_type == "return") {
                if (product?.['@ondc/org/returnable'] != "true"||product?.['@ondc/org/returnable'] != true) {
                    flag=false
                }
            }
        });
        if( flag==false){
            return res.status(401)
                .setHeader('Proxy-Authenticate', proxy_auth)
                .json({
                    message: {
                        "ack": { "status": "NACK" },
                        "error": { "type": "BPP", "code": "10001", "message": "Invalid" }
                    }
                })
        }
        isSignatureValid(proxy_auth, req.body).then((isValid) => {
            if (!isValid) {
                return res.status(401)
                    .setHeader('Proxy-Authenticate', proxy_auth)
                    .json({
                        message: {
                            "ack": { "status": "NACK" },
                            "error": { "type": "BAP", "code": "10001", "message": "Invalid Signature" }
                        }
                    })
            }
             else {
                res.status(200).send(messages.getAckResponse(req.body.context));


                var data = {
                    "meta_data": {
                        "access_template_id": 1,
                        "token_user_id": 1,
                        "company_id": 1,
                        "request_id": String(uuidv4()),
                        "encryption": false,
                        "additional_fields": {
                            "type": "get_order_quote"
                        }

                    },
                    "data": req.body
                }
                produceKafkaEvent(kafkaClusters.Tech, topics.BPP_SALES_ORDER_STATUS, data).catch(console.error)
                // const end_point = req.body.context.bap_uri;
                // updateOrderService.bppOnUpdateOrderResponse(end_point, req.body);
            }
        })
    }

    /**
    * on update order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onUpdate(req, res, next) {
        const { query } = req;
        const { messageId } = query;

        if (messageId) {
            updateOrderService.onUpdate(messageId).then(order => {
                res.json(order);
            }).catch((err) => {
                next(err);
            });
        }
        else
            throw new BadRequestParameterError();

    }
}

export default UpdateOrderController;
