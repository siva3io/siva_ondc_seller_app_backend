import { onOrderCancel ,onUpdateStatus} from "../../../shared/utils/protocolApis/index.js";
import { PROTOCOL_CONTEXT } from "../../../shared/utils/constants.js";
import { addOrUpdateOrderWithTransactionId,getOrderById } from "../../../shared/db/dbService.js";

import BppUpdateService from "./bppUpdate.service.js";
import ContextFactory from "../../../shared/factories/ContextFactory.js";
import CustomError from "../../../shared/lib/errors/custom.error.js";
import NoRecordFoundError from "../../../shared/lib/errors/no-record-found.error.js";
import OrderMongooseModel from '../../../shared/db/order.js';
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
const bppUpdateService = new BppUpdateService();

class UpdateOrderService {

    /**
    * update order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
     async updateOrder(orderRequest, isMultiSellerRequest = false) {
        try {
            const { context: requestContext = {}, message: message = {} } = orderRequest || {};

            const contextFactory = new ContextFactory();
            const context = contextFactory.create(
                {
                    domain: requestContext.domain ? requestContext.domain : process.env.DOMAIN,
                    country: requestContext.country ? requestContext.country : process.env.COUNTRY,
                    city: requestContext.city ? requestContext.city : process.env.CITY,
                    action: requestContext.action ? requestContext.action : PROTOCOL_CONTEXT.UPDATE,
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

            const bppResponse = await bppUpdateService.update(
                requestContext.bpp_uri,
                context,
                "item",
                message?.order
            );

            return bppResponse;
        }
        catch (err) {
            throw err;
        }
    }


    /**
    * update order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
     async ONDCUpdateOrder(orderRequest, isMultiSellerRequest = false) {
        try {
            const { context: requestContext = {}, message = {} } = orderRequest;
            const { items = [], fulfillments = [], payment = {} } = message.order;

            var validation_flag = new BAPValidator().validateUpdate(orderRequest)

            if(!validation_flag){
                return res.status(401)
                
                .json({ message : { 
                        "ack": { "status": "NACK" },  
                        "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" } } 
                    })
            }

            const bppResponse = await bppUpdateService.ONDCUpdate(
                requestContext.bpp_uri,
                orderRequest
            );

            return bppResponse;
        }
        catch (err) {
            throw err;
        }
    }


    /**
    * on cancel order
    * @param {Object} messageId
    */
    async onUpdate(messageId) {
        try {
            let protocolUpdateResponse = await onUpdateStatus(messageId);

            if (!(protocolUpdateResponse && protocolUpdateResponse.length)) {
                const contextFactory = new ContextFactory();
                const context = contextFactory.create({
                    messageId: messageId,
                    action: PROTOCOL_CONTEXT.ON_UPDATE
                });

                return {
                    context,
                    error: {
                        message: "No data found"
                    }
                };
            }
            else {
                if (!(protocolUpdateResponse?.[0].error)) {

                    protocolUpdateResponse = protocolUpdateResponse?.[0];

                    const dbResponse = await OrderMongooseModel.find({
                        transactionId: protocolUpdateResponse.context.transaction_id
                    });

                    if (!(dbResponse || dbResponse.length))
                        throw new NoRecordFoundError();
                    else {
                        const orderSchema = dbResponse?.[0].toJSON();
                        orderSchema.state = protocolUpdateResponse?.message?.order?.state;

                        let op =orderSchema?.items.map((e,i)=>{


                            let temp = protocolUpdateResponse?.message?.order?.items.find(element=> element.id === e.id)
                            if(temp) {
                                e.return_status = temp?.tags?.status;
                                e.cancellation_status = temp?.tags?.status;
                            }
                            if(!e.cancellation_status || !e.return_status ){
                                e.cancellation_status ='Cancelled' //TODO: change from actual response
                                e.return_status ='Return Approved' //TODO: change from actual response
                            }
                            return e;
                        })

                        //get item from db and update state for item
                        orderSchema.items = op;

                        await addOrUpdateOrderWithTransactionId(
                            protocolUpdateResponse.context.transaction_id,
                            { ...orderSchema }
                        );
                    }
                }
                
                return protocolUpdateResponse;
            }

        }
        catch (err) {
            throw err;
        }
    }

    /**
    * on update order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
         async bppOnUpdateOrderResponse(uri, context, orderDetails, cancelOrderRequest) {
            try {
                
                const bppResponse = await bppUpdateService.bppOnUpdateResponse(
                    uri,
                    context, 
                    orderDetails,
                    cancelOrderRequest
                );
    
                return bppResponse;
            }
            catch (err) {
                throw err;
            }
        }
}

export default UpdateOrderService;
