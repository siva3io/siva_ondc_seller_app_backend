import CancelOrderService from './cancelOrder.service.js';
import BadRequestParameterError from '../../../shared/lib/errors/bad-request-parameter.error.js';
import { isSignatureValid } from '../../../shared/utils/cryptic.js';
import messages from '../../../shared/utils/messages.js';
import { getOrderByTransactionId, getProductById } from '../../../shared/db/dbService.js';
import { produceKafkaEvent, kafkaClusters } from '../../../shared/eda/kafka.js'
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js';
import { v4 as uuidv4 } from 'uuid';
import CustomLogs from '../../../shared/utils/customLogs.js';
import { PROTOCOL_CONTEXT, SUBSCRIBER_TYPE } from '../../../shared/utils/constants.js';
import { getSubscriberType } from '../../../shared/utils/registryApis/registryUtil.js';
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
const cancelOrderService = new CancelOrderService();

class CancelOrderController {
    /**
    * cancel order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    cancelOrder(req, res, next) {
        const { body: orderRequest } = req;

        cancelOrderService.cancelOrder(orderRequest).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }


    /**
    * cancel order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    ONDCCancelOrder(req, res, next) {
        const { body: orderRequest } = req;

        cancelOrderService.ONDCCancelOrder(orderRequest).then(response => {
            res.json(response);
        }).catch((err) => {
            next(err);
        });
    }


    /**
    * on cancel order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onCancelOrder(req, res, next) {
        const { query } = req;
        const { messageId } = query;

        if (messageId) {
            cancelOrderService.onCancelOrder(messageId).then(order => {
                res.json(order);
            }).catch((err) => {
                next(err);
            });
        }
        else
            throw new BadRequestParameterError();

    }


    /**
    * select
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async bppCancelOrder(req, res, next) {
        var proxy_auth = ""

        if (req.body.context.bpp_id == process.env.BPP_ID) {
            proxy_auth = req.headers["authorization"]?.toString() || "";
        }

        CustomLogs.writeRetailLogsToONDC(JSON.stringify(req.body), PROTOCOL_CONTEXT.CANCEL, getSubscriberType(SUBSCRIBER_TYPE.BPP))


        //const orderDetails = await getOrderByTransactionId(req.body.context.transaction_id);


        // if (!orderDetails){
        //     return res.status(401)
        //         .setHeader('Proxy-Authenticate', proxy_auth)
        //         .json({ message : { 
        //                 "ack": { "status": "NACK" },  
        //                 "error": { "type": "BAP", "code": "10001", "message": "Invalid Signature" } } 
        //             })
        // }

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
            } else {
                res.status(200).send(messages.getAckResponse(req.body.context));
                    var data = {
                        "meta_data": {
                            "access_template_id": 1,
                            "token_user_id": 1,
                            "company_id": 1,
                            "request_id": String(uuidv4()),
                            "encryption": false,
                            "additional_fields":{
                                "type":"cancel"
                            }
                        },
                        "data": req.body
                    }

                    produceKafkaEvent(kafkaClusters.Tech, topics.SALES_ORDER_CANCEL, data).catch(console.error)
            }
        })
    }
}

export default CancelOrderController;
