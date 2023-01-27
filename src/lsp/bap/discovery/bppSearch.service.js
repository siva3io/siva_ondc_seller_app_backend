import { protocolSearch,commonProtocolAPIForLsp } from "../../../shared/utils/protocolApis/index.js";
import PROTOCOL_API_URLS from "../../../shared/utils/protocolApis/routes.js";
import { kafkaClusters, produceKafkaEvent } from '../../../shared/eda/kafka.js'
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js'
import { redisSubscribe } from "../../../shared/database/redis.js";
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

//=================== ONDC ======================================================================================

    /**
     * 
     * @param {Object} context 
     * @param {Object} req 
     * @returns 
     */
     async ONDCSearch(searchRequest) {
        try {  
          const response = await protocolSearch(searchRequest);
          return { context: response.context, message: response.message };
      }
      catch (err) {
          throw err;
      }
      }

//=================== LSP ======================================================================================

    /**
     * 
     * @param {Object} context 
     * @param {Object} req 
     * @returns 
     */

     async ONDCLspSearchEvent(searchRequest) {
        try {  
              let topic = topics.LSP_BAP_BPP_SEARCH
  
              await produceKafkaEvent(kafkaClusters.BG,topic, searchRequest)
             
              let response = await redisSubscribe(searchRequest?.context?.message_id)
  
              return { context: response.context, message: response.message };
        }
        catch (err) {
            return err;
        }
    }

    async ONDCSearchEvent(searchRequest) {
        try {            
            const response = await commonProtocolAPIForLsp(process.env.PROTOCOL_BASE_URL, PROTOCOL_API_URLS.SEARCH, searchRequest,process.env.LSP_BAP_ID,process.env.LSP_BAP_UNIQUE_KEY_ID,process.env.LSP_BAP_PRIVATE_KEY);
            return { context: searchRequest.context, message: response.message };
        }
        catch (err) {
            return err;
        }
    }
}

export default BppSearchService;
