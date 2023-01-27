
import { consumeKafkaEvent, produceKafkaEvent } from '../../../shared/eda/kafka.js'
import Service from './orderStatus.service.js'
// import CancelOrderService from '../cancel/cancelOrder.service.js';
import UpdateOrderService from '../update/updateOrder.service.js';
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
// const cancelOrderService = new CancelOrderService()
const updateOrderService = new UpdateOrderService()

const bppOrderStatusConsumer = async (consumerConfig) => {

    const service = new Service();

    let consumer = await consumeKafkaEvent(consumerConfig)
    
    await consumer.run({
        // autoCommitInterval: 5000,
        eachMessage: async ({ topic, partition, message }) => {
            // console.log({
            //     partition,
            //     topic: topic,
            //     offset: message.offset,
            //     value: message.value.toString(),
            // })
            let request = JSON.parse(message.value.toString());
            if (request?.meta_data?.additional_fields?.type == "get_order_status") {
                service.bppOnStatusOrderResponse(request?.data, request?.order_request)

            } else if (request?.meta_data?.additional_fields?.type == "get_order_quote") {
                // console.log("123");
                // console.log("request", JSON.stringify(request))
                updateOrderService.bppOnUpdateOrderResponse(request?.data?.ondc_context?.context?.bap_uri, {}, request?.data, request?.order_request)
            }


        },
    })

}


export {
    bppOrderStatusConsumer
}