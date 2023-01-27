import { kafkaClusters, produceKafkaEvent } from '../../../../../shared/eda/kafka.js'
import { topics } from '../../../../../shared/eda/consumerInit/initConsumer.js'
import { redisSubscribe } from "../../../../../shared/database/redis.js";

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

class BppInitService {

  /**
   * bpp init order
   * @param {Object} context
   * @param {Object} order
   * @param {String} parentOrderId
   */
   async lspInit(context, order = {}) {
    try {

      const initRequest = {
        context: context,
        message: order,
      };

      let topic = topics.CLIENT_API_LSP_BAP_INIT

      await produceKafkaEvent(kafkaClusters.LSP,topic, initRequest)
           
      let responseMessage = await redisSubscribe(context.message_id)
      return responseMessage;
      
    } catch (err) {
      console.log("Error =======>>> ",err);
      return err;
    }
  }
}

export default BppInitService;
