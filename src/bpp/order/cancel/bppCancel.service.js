import { PROTOCOL_CONTEXT } from "../../../shared/utils/constants.js";
import { BAPApiCall, bppProtocolOnCancel, protocolCancel } from "../../../shared/utils/protocolApis/index.js";
import PROTOCOL_API_URLS from "../../../shared/utils/protocolApis/routes.js";
import { addOrUpdateOrderWithTransactionId, getOrderById, getOrderByTransactionId } from "../../../shared/db/dbService.js";
import { produceKafkaEvent } from '../../../shared/eda/kafka.js'
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js'
import { redisSubscribe } from "../../../shared/database/redis.js";
import { UpdateBppOrder } from "../../../shared/db/bpp_dbService.js";
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
class BppCancelService {

    /**
     * 
     * @param {Object} context 
     * @param {String} orderId 
     * @param {String} cancellationReasonId 
     * @returns 
     */
    async cancelOrder(context, orderId, cancellationReasonId = "001") {
        try {

            const cancelRequest = {
                context: context,
                message: {
                    order_id: orderId,
                    cancellation_reason_id: cancellationReasonId
                }
            }

            let topic = process.env.KAFKA_TOPIC_PREFIX + '.' + topics.CLIENT_API_BAP_CANCEL

            await produceKafkaEvent(topic, cancelRequest)

            let response = await redisSubscribe(cancelRequest.context.message_id)

            // const response = await BAPApiCall(context.bap_uri, PROTOCOL_API_URLS.CANCEL, cancelRequest);

            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }


    /**
     * 
     * @param {Object} context 
     * @param {String} orderId 
     * @param {String} cancellationReasonId 
     * @returns 
     */
    async ONDCCancelOrder(uri, context = {}, orderRequest = {}) {
        try {

            let topic = process.env.KAFKA_TOPIC_PREFIX + '.' + topics.BAP_BPP_CANCEL

            await produceKafkaEvent(topic, { uri, orderRequest })

            let response = await redisSubscribe(orderRequest.context.message_id)

            // const response = await protocolCancel(context.bpp_uri, orderRequest);

            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

    async ONDCCancelOrderEvent({ uri, orderRequest = {} }) {
        try {

            const response = await protocolCancel(uri, orderRequest);

            return response;
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * bpp on cancel order
    * @param {Object} context
    * @param {Object} order
    * @param {String} parentOrderId
    */
    async bppOnCancelResponse(uri, context = {}, orderDetails, cancelOrderRequest) {
        try {

            context.bpp_uri = process.env.BPP_URL;
            context.bpp_id = process.env.BPP_ID;
            context.action = PROTOCOL_CONTEXT.ON_CANCEL;
            context.message_id=cancelOrderRequest?.context?.message_id
            context.timestamp = new Date().toISOString();

            var ms = new Date().getTime() + 86400000;
            var tomorrow = new Date(ms);
            const cancelRequest = {
                context: context,
                message: {
                    "order":
                    {
                        "id": orderDetails?.ondc_context?.message?.order?.id||orderDetails?.message?.order_id,  // need to check case
                        "state": "Cancelled",
                        "tags": {
                            "cancellation_reason_id": cancelOrderRequest?.message?.cancellation_reason_id
                        },
                        "quote":orderDetails?.ondc_context?.message?.order?.quote||{},
                        "fulfillments":orderDetails?.ondc_context?.message?.order?.fulfillments.map(fulfillment => {
                            return {
                                "id":fulfillment?.id||"Fulfillment-01",
                                "state":{
                                   "descriptor":{
                                      "code":"Cancelled",
                                      "name":"Cancelled"
                                   }
                                }
                             };
                        }) 
                    }
                },
            };

            
            
            // await addOrUpdateOrderWithTransactionId(orderDetails?.transactionId, {
            //     ...orderDetails,
            //   });
            await UpdateBppOrder({transactionId: orderDetails?.ondc_context?.context?.transaction_id}, {state: 'Cancelled'})

            await bppProtocolOnCancel(uri, cancelRequest);
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppCancelService;
