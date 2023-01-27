import { consumeKafkaEvent, produceKafkaEvent } from '../../../shared/eda/kafka.js'
import Service from './cancelOrder.service.js'
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

const bppCancelOrderConsumer = async (consumerConfig) => {

    const service = new Service();
    
    let consumer = await consumeKafkaEvent(consumerConfig)

    await consumer.run({
        autoCommitInterval: 5000,
        eachMessage: async ({ topic, partition, message }) => {
            console.log({
                partition,
                topic: topic,
                offset: message.offset,
            });
            let request = JSON.parse(message.value.toString());
            service.bppOnCancelOrderResponse(request?.data?.ondc_context?.context?.bap_uri, request?.data?.ondc_context?.context, request?.data,request?.cancel_request)
        },
    })

}


export {
    bppCancelOrderConsumer
}