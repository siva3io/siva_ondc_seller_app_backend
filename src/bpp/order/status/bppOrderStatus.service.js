import PROTOCOL_API_URLS from "../../../shared/utils/protocolApis/routes.js";
import { BAPApiCall, bppProtocolOnStatus, protocolOrderStatus } from "../../../shared/utils/protocolApis/index.js";
import { addOrUpdateOrderWithTransactionId, getOrderById, getOrderByTransactionId } from "../../../shared/db/dbService.js";
import { PROTOCOL_CONTEXT } from "../../../shared/utils/constants.js";
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
class BppOrderStatusService {

    /**
     * bpp order status
     * @param {Object} context 
     * @param {Object} message 
     * @returns 
     */
    async getOrderStatus(uri, context, message = {}) {
        try {

            const orderStatusRequest = {
                context: context,
                message: message
            }

            // const response = await BAPApiCall(context.bap_uri, PROTOCOL_API_URLS.STATUS, orderStatusRequest);


            let topic = process.env.KAFKA_TOPIC_PREFIX + '.' + topics.CLIENT_API_BAP_STATUS

            await produceKafkaEvent(topic, orderStatusRequest)

            let response = await redisSubscribe(orderStatusRequest.context.message_id)


            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * bpp order status
     * @param {Object} context 
     * @param {Object} message 
     * @returns 
     */
    async getONDCOrderStatus(uri, orderRequest) {
        try {

            let topic = process.env.KAFKA_TOPIC_PREFIX + '.' + topics.BAP_BPP_STATUS

            await produceKafkaEvent(topic, { uri, orderRequest })

            let response = await redisSubscribe(orderRequest.context.message_id)

            // const response = await protocolOrderStatus(uri, orderRequest);

            return { context: response.context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

    async getONDCOrderStatusEvent({ uri, orderRequest }) {
        try {

            const response = await protocolOrderStatus(uri, orderRequest);

            return response;
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * bpp on update order
    * @param {Object} context
    * @param {Object} order
    * @param {String} parentOrderId
    */
    async bppOnStatusResponse(orderDetails = {}, statusRequest = {}) {
        try {

            const {context:context} = statusRequest
            context.bpp_uri = process.env.BPP_URL;
            context.bpp_id = process.env.BPP_ID;
            context.action = PROTOCOL_CONTEXT.ON_STATUS;
            context.timestamp = new Date().toISOString();

            // console.log("orderDetails",JSON.stringify(orderDetails));
            const OnstatusRequest = {
                context: context,
                message: {
                    "order":
                    {
                        "id": statusRequest?.message?.order_id|| orderDetails?.reference_number,
                        "state": orderDetails?.ondc_context?.message?.order?.state,
                        "provider": orderDetails?.ondc_context?.message?.order?.provider,
                        "items": orderDetails?.ondc_context?.message?.order?.items,
                        "billing": orderDetails?.ondc_context?.message?.order?.billing,
                        "quote": orderDetails?.ondc_context?.message?.order?.quote,
                        "fulfillments": orderDetails?.ondc_context?.message?.order?.fulfillments,
                        "payment": orderDetails?.ondc_context?.message?.order?.payment,
                        //   "created_at":  new Date().toISOString(),
                        //   "updated_at":  new Date().toISOString()                  
                    }
                }
            }

            await UpdateBppOrder({transactionId: orderDetails?.ondc_context?.context?.transaction_id}, {state: orderDetails?.ondc_context?.message?.order?.state})

            await bppProtocolOnStatus(context?.bap_uri, OnstatusRequest);
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppOrderStatusService;
