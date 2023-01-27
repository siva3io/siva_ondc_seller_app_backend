import { v4 as uuidv4 } from 'uuid';

import { ORDER_STATUS, PAYMENT_COLLECTED_BY, PAYMENT_TYPES, PROTOCOL_CONTEXT, PROTOCOL_PAYMENT } from "../../../../shared/utils/constants.js";
import { BAPApiCall, bppProtocolOnConfirm, protocolConfirm, commonProtocolAPIForLsp } from '../../../../shared/utils/protocolApis/index.js';
import PROTOCOL_API_URLS from "../../../../shared/utils/protocolApis/routes.js";
import { addOrUpdateOrderWithTransactionId } from '../../../../shared/db/dbService.js';
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

class BppConfirmService {


     async ONDCLspConfirm(uri, confirmRequest) {
        try {
            let topic = topics.LSP_BAP_BPP_CONFIRM
  
            await produceKafkaEvent(kafkaClusters.BG,topic, {uri, confirmRequest})

            produceKafkaEvent(kafkaClusters.WEB3, topics.WEB3_LIVE_FEED, confirmRequest)

            let response = await redisSubscribe(confirmRequest.context.message_id)    
    
            return { context: confirmRequest.context, message: response.message };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
        /**
     * 
     * @param {Object} context 
     * @param {Object} req 
     * @returns 
     */
    async ONDCConfirm(uri, confirmRequest) {
        try {    
    
            const response = await commonProtocolAPIForLsp(uri, PROTOCOL_API_URLS.CONFIRM, confirmRequest, process.env.LSP_BAP_ID, process.env.LSP_BAP_UNIQUE_KEY_ID, process.env.LSP_BAP_PRIVATE_KEY);
    
            return { context: confirmRequest.context, message: response.message };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
    
    async ONDCConfirmEvent({uri, confirmRequest}) {
        try {
    
            const response = await commonProtocolAPIForLsp(uri, PROTOCOL_API_URLS.CONFIRM, confirmRequest, process.env.LSP_BAP_ID, process.env.LSP_BAP_UNIQUE_KEY_ID, process.env.LSP_BAP_PRIVATE_KEY);
            
            return { context: confirmRequest.context, message: response.message };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
    
}

export default BppConfirmService;
