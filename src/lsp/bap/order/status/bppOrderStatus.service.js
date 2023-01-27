import PROTOCOL_API_URLS from "../../../../shared/utils/protocolApis/routes.js";
import {commonProtocolAPIForLsp } from "../../../../shared/utils/protocolApis/index.js";
import { topics } from '../../../../shared/eda/consumerInit/initConsumer.js'
import { redisSubscribe } from "../../../../shared/database/redis.js";
import { kafkaClusters, produceKafkaEvent } from '../../../../shared/eda/kafka.js'

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
     async getONDCLspOrderStatus(uri, orderRequest) {
        try {
            
            let topic = topics.LSP_BAP_BPP_STATUS

            await produceKafkaEvent(kafkaClusters.BG,topic, {uri, orderRequest})

            produceKafkaEvent(kafkaClusters.WEB3, topics.WEB3_LIVE_FEED, orderRequest)
           
            let response = await redisSubscribe(orderRequest.context.message_id)      

            return { context: response.context, message: response.message };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
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

                const response = await commonProtocolAPIForLsp(uri, PROTOCOL_API_URLS.STATUS, orderRequest, process.env.LSP_BAP_ID, process.env.LSP_BAP_UNIQUE_KEY_ID, process.env.LSP_BAP_PRIVATE_KEY);
                return { context: response.context, message: response.message };
            }
            catch (err) {
                console.log("Error =======>>> ",err);
                return err;
            }
        }
    
        async getONDCOrderStatusEvent({uri, orderRequest}) {
            try {
                
                const response = await commonProtocolAPIForLsp(uri, PROTOCOL_API_URLS.STATUS, orderRequest, process.env.LSP_BAP_ID, process.env.LSP_BAP_UNIQUE_KEY_ID, process.env.LSP_BAP_PRIVATE_KEY);
    
                return { context: orderRequest.context, message: response.message };
            }
            catch (err) {
                console.log("Error =======>>> ",err);
                return err;
            }
        }
}

export default BppOrderStatusService;
