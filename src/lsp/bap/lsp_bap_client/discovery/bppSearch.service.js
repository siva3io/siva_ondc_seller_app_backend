import { kafkaClusters, produceKafkaEvent } from '../../../../shared/eda/kafka.js'
import { topics } from '../../../../shared/eda/consumerInit/initConsumer.js'
import { redisSubscribe } from "../../../../shared/database/redis.js";
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
class BppSearchService {

    /**
     * 
     * @param {Object} context 
     * @param {Object} req 
     * @returns 
     */

     async lspSearch(context = {}, req = {}) {
        try {
            const { message = {} } = req || {};
            
            const searchRequest = {
                context: context,
                message: message,
            }

            let topic = topics.CLIENT_API_LSP_BAP_SEARCH

            await produceKafkaEvent(kafkaClusters.LSP,topic, searchRequest)
           
            let searchResponse = await redisSubscribe(searchRequest?.context?.message_id) 
            
            return { context: context, message: searchResponse.message};
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
}

export default BppSearchService;
