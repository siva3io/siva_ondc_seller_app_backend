import OrderStatusService from './orderStatus.service.js';
import BadRequestParameterError from '../../../shared/lib/errors/bad-request-parameter.error.js';
import { isSignatureValid } from '../../../shared/utils/cryptic.js';
import messages from '../../../shared/utils/messages.js';
import CustomLogs from '../../../shared/utils/customLogs.js';
import { PROTOCOL_CONTEXT, SUBSCRIBER_TYPE } from '../../../shared/utils/constants.js';
import { getSubscriberType } from '../../../shared/utils/registryApis/registryUtil.js';
import { v4 as uuidv4 } from 'uuid';
import { kafkaClusters, produceKafkaEvent } from "../../../shared/eda/kafka.js";
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js';
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
const orderStatusService = new OrderStatusService();

class OrderStatusController {

    /**
    * Update status
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
     statusOrder(req, res, next) {
        const { body: statusRequest } = req;

        orderStatusService.orderStatus(statusRequest).then(response => {
            res.json({ ...response });
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * Update status
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
     ONDCStatusOrder(req, res, next) {
        const { body: statusRequest } = req;

        orderStatusService.ONDCOrderStatus(statusRequest).then(response => {
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
     bppStatusOrder(req, res, next) {
        var proxy_auth = ""

        if(req.body.context.bpp_id == process.env.BPP_ID) {
            proxy_auth = req.headers["authorization"]?.toString() || "";
        }

        CustomLogs.writeRetailLogsToONDC(JSON.stringify(req.body), PROTOCOL_CONTEXT.STATUS,getSubscriberType(SUBSCRIBER_TYPE.BPP))

        isSignatureValid(proxy_auth, req.body).then((isValid) => {
            if(!isValid) {
                return res.status(401)
                .setHeader('Proxy-Authenticate', proxy_auth)
                .json({ message : { 
                        "ack": { "status": "NACK" },  
                        "error": { "type": "BAP", "code": "10001", "message": "Invalid Signature" } } 
                    })
            } else {
                res.status(200).send(messages.getAckResponse(req.body.context));
                // const end_point = req.body.context.bap_uri;
                //  orderStatusService.bppOnStatusOrderResponse(end_point, req.body);
                var data = {
                    "meta_data": {
                        "access_template_id": 1,
                        "token_user_id": 1,
                        "company_id": 1,
                        "request_id":String(uuidv4()),
                        "encryption": false,
                        "additional_fields":{
                            "type":"get_order_status"
                        }

                    },
                    "data": req.body
                }
                produceKafkaEvent(kafkaClusters.Tech, topics.BPP_SALES_ORDER_STATUS, data).catch(console.error)
    
            }
        })
    }



    
    /**
    * order status
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    orderStatus(req, res, next) {
        const { body: order } = req;

        orderStatusService.orderStatus(order).then(response => {
            res.json({ ...response });
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * multiple order status
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    orderStatusV2(req, res, next) {
        const { body: orders } = req;

        if (orders && orders.length) {

            orderStatusService.orderStatusV2(orders).then(response => {
                res.json(response);
            }).catch((err) => {
                next(err);
            });

        }
        else
            throw new BadRequestParameterError();
    }

    /**
    * on order status
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onOrderStatus(req, res, next) {
        const { query } = req;
        const { messageId } = query;
        
        orderStatusService.onOrderStatus(messageId).then(order => {
            res.json(order);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on multiple order status
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onOrderStatusV2(req, res, next) {
        const { query } = req;
        const { messageIds } = query;
        
        if(messageIds && messageIds.length && messageIds.trim().length) { 
            const messageIdsArray = messageIds.split(",");
            
            orderStatusService.onOrderStatusV2(messageIdsArray).then(orders => {
                res.json(orders);
            }).catch((err) => {
                next(err);
            });
            
        }
        else
            throw new BadRequestParameterError();
    }
}

export default OrderStatusController;
