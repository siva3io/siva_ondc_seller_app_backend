import { onOrderStatus } from "../../../shared/utils/protocolApis/index.js";
import { PROTOCOL_CONTEXT } from "../../../shared/utils/constants.js";
import {addOrUpdateOrderWithTransactionId, getOrderById} from "../../../shared/db/dbService.js";
import OrderMongooseModel from '../../../shared/db/order.js';

import ContextFactory from "../../../shared/factories/ContextFactory.js";
import BppOrderStatusService from "./bppOrderStatus.service.js";
import BAPValidator from "../../../shared/utils/validations/bap_validations/validations.js";
import { v4 as uuidv4} from 'uuid';
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
const bppOrderStatusService = new BppOrderStatusService();

class OrderStatusService {

    /**
    * on update order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
     async bppOnStatusOrderResponse(orderDetails, orderRequest) {
        try {
           
            const bppResponse = await bppOrderStatusService.bppOnStatusResponse(
                orderDetails,
                orderRequest
            );

            return bppResponse;
        }
        catch (err) {
            throw err;
        }
    }
    
    /**
    * status order
    * @param {Object} order
    */
    async orderStatus(order) {
        try {

            const { context: requestContext, message } = order || {};


            const contextFactory = new ContextFactory();
            const context = contextFactory.create(
                {
                domain: requestContext.domain ? requestContext.domain : process.env.DOMAIN,
                country: requestContext.country ? requestContext.country : process.env.COUNTRY,
                city: requestContext.city ? requestContext.city : process.env.CITY,
                action: requestContext.action ? requestContext.action : PROTOCOL_CONTEXT.STATUS,
                core_version: requestContext.core_version ? requestContext.core_version : PROTOCOL_CONTEXT.CORE_VERSION,
                ttl: requestContext.ttl ? requestContext.ttl : null,
                message_id: requestContext.message_id ? requestContext.message_id : uuidv4(),
                timestamp: requestContext.timestamp ? requestContext.timestamp  : new Date().toISOString(),
                transactionId: requestContext.transaction_id,
                bppId: requestContext.bpp_id,
                bppUrl: requestContext.bpp_uri,
                bapId: requestContext.bap_id ? requestContext.bap_id : process.env.BAP_ID,
                bapUrl: requestContext.bap_uri ? requestContext.bap_id : process.env.BAP_URL,
                }
                );

            return await bppOrderStatusService.getOrderStatus(
                requestContext?.bpp_uri,
                context,
                message
            );
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * status order
    * @param {Object} order
    */
     async ONDCOrderStatus(orderRequest) {
        try {

            const { context: requestContext = {}, message = {} } = orderRequest;

            var validation_flag = new BAPValidator().validateStatus(orderRequest)

            if(!validation_flag){
                return res.status(401)
                .json({ message : { 
                        "ack": { "status": "NACK" },  
                        "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" } } 
                    })
            }

            return await bppOrderStatusService.getONDCOrderStatus(
                requestContext.bpp_uri,
                orderRequest
            );
        }
        catch (err) {
            throw err;
        }
    }

    async ONDCOrderStatusEvent(orderRequest) {
        try {

            const { context: requestContext = {}, message = {} } = orderRequest;

            var validation_flag = new BAPValidator().validateStatus(orderRequest)

            if(!validation_flag){
                return { message : { 
                    "ack": { "status": "NACK" },  
                    "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" } } 
                }
            }

            return await bppOrderStatusService.getONDCOrderStatus(
                requestContext.bpp_uri,
                orderRequest
            );
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * multiple order status
     * @param {Array} orders 
     */
    async orderStatusV2(orders) {

        const orderStatusResponse = await Promise.all(
            orders.map(async order => {
                try {

                    const orderResponse = await this.orderStatus(order);
                    return orderResponse;
                }
                catch (err) {
                    throw err;
                }
            })
        );

        return orderStatusResponse;
    }

    /**
    * on status order
    * @param {String} messageId
    */
    async onOrderStatus(messageId) {
        try {
            let protocolOrderStatusResponse = await onOrderStatus(messageId);

            if(protocolOrderStatusResponse && protocolOrderStatusResponse.length)
                return protocolOrderStatusResponse?.[0];
            else {
                const contextFactory = new ContextFactory();
                const context = contextFactory.create({
                    action: PROTOCOL_CONTEXT.ON_STATUS,
                });
                return {
                    context,
                    error: {
                        message: "No data found"
                    }
                };
            }
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on multiple order status
    * @param {String} messageIds
    */
    async onOrderStatusV2(messageIds) {
        try {
            const onOrderStatusResponse = await Promise.all(
                messageIds.map(async messageId => {
                    try {
                        const onOrderStatusResponse = await this.onOrderStatus(messageId);

                        let fulfillmentItems =onOrderStatusResponse.message?.order?.fulfillments?.map((fulfillment,i)=>{
                            let temp = onOrderStatusResponse?.message?.order?.items?.find(element=> element.fulfillment_id === fulfillment.id)
                            if(temp){
                                temp.state = fulfillment.state?.descriptor?.code??""
                                return temp;
                            }
                        })

                        if(!onOrderStatusResponse.error) {
                            const dbResponse = await OrderMongooseModel.find({
                                transactionId: onOrderStatusResponse?.context?.transaction_id
                            });

                            if ((dbResponse && dbResponse.length)) {
                                const orderSchema = dbResponse?.[0].toJSON();
                                orderSchema.state = onOrderStatusResponse?.message?.order?.state;

                                let op =orderSchema?.items.map((e,i)=>{
                                    let temp = fulfillmentItems?.find(element=> element?.id === e?.id)
                                    if(temp) {
                                        e.fulfillment_status = temp.state;
                                    }else{
                                        e.fulfillment_status = ""
                                    }
                                    return e;
                                })

                                orderSchema.items = op;

                                await addOrUpdateOrderWithTransactionId(
                                    onOrderStatusResponse?.context?.transaction_id,
                                    { ...orderSchema }
                                );
                                
                                return { ...onOrderStatusResponse };

                            }
                            else {
                                const contextFactory = new ContextFactory();
                                const context = contextFactory.create({
                                    action: PROTOCOL_CONTEXT.ON_STATUS
                                });

                                return {
                                    context,
                                    error: {
                                        message: "No data found"
                                    }
                                };
                            }
                        }
                        else {
                            return { ...onOrderStatusResponse };
                        }
                        
                    }
                    catch (err) {
                        throw err;
                    }
                })
            );

            return onOrderStatusResponse;
        }
        catch (err) {
            throw err;
        }
    }
}

export default OrderStatusService;
