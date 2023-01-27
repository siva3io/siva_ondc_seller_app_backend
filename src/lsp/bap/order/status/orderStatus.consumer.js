import { consumeKafkaEvent, produceKafkaEvent } from '../../../../shared/eda/kafka.js'
import Service from './orderStatus.service.js';
import BppService from './bppOrderStatus.service.js';
import { topics } from '../../../../shared/eda/consumerInit/initConsumer.js'
import { redisClient } from "../../../../shared/database/redis.js";

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

const lspBapStatusConsumer = async (consumerConfig) => {

    const service = new Service();
    let cluster = consumerConfig.cluster

    let consumer = await consumeKafkaEvent(consumerConfig)

    await consumer.run({
        autoCommitInterval: 5000,
        eachMessage: async ({ topic, partition, message }) => {
            // console.log({
            //     partition,
            //     topic: topic,
            //     offset: message.offset,
            //     value: message.value.toString(),
            // })

            let request = JSON.parse(message.value.toString());
            
            let topic_ack = topics.CLIENT_API_LSP_BAP_STATUS_ACK

            service.ONDCLspOrderStatusEvent(request).then(response => {
                produceKafkaEvent(cluster, topic_ack, response);
            }).catch((err) => {
                console.log("Error =======>>> ",err);
                produceKafkaEvent(cluster, topic_ack, err);
            });
        },
    })
}
const lspBapStatusAckConsumer = async (consumerConfig) => {
    
    let consumer = await consumeKafkaEvent(consumerConfig)

    await consumer.run({
        autoCommitInterval: 5000,
        eachMessage: async ({ topic, partition, message }) => {

            let response = JSON.parse(message.value.toString());

            // console.log({
            //     partition,
            //     topic: topic,
            //     offset: message.offset,
            //     value: message.value.toString(),
            // })
            if (response?.context?.message_id) {
                await redisClient.set(response.context?.message_id, JSON.stringify(response));
            }
        }
    }
    )
}
const lspBapBppStatusConsumer = async (consumerConfig) => {

    const service = new BppService();
    let cluster = consumerConfig.cluster

    let consumer = await consumeKafkaEvent(consumerConfig)

    await consumer.run({
        autoCommitInterval: 5000,
        eachMessage: async ({ topic, partition, message }) => {
            // console.log({
            //     partition,
            //     topic: topic,
            //     offset: message.offset,
            //     value: message.value.toString(),
            // })

            let request = JSON.parse(message.value.toString());
            
            let topic_ack = topics.LSP_BAP_BPP_STATUS_ACK

            service.getONDCOrderStatusEvent(request).then(response => {
                produceKafkaEvent(cluster, topic_ack, response);
            }).catch((err) => {
                console.log("Error =======>>> ",err);
                produceKafkaEvent(cluster, topic_ack, err);
            });
        },
    })
}
const lspBapBppStatusAckConsumer = async (consumerConfigd) => {
    
    let consumer = await consumeKafkaEvent(consumerConfigd)

    await consumer.run({
        autoCommitInterval: 5000,
        eachMessage: async ({ topic, partition, message }) => {

            let response = JSON.parse(message.value.toString());

            // console.log({
            //     partition,
            //     topic: topic,
            //     offset: message.offset,
            //     value: message.value.toString(),
            // })

            if (response?.context?.message_id) {
                await redisClient.set(response.context?.message_id, JSON.stringify(response));
            }
        }
    }
    )
}

export {
    lspBapStatusConsumer,
    lspBapStatusAckConsumer,
    lspBapBppStatusConsumer,
    lspBapBppStatusAckConsumer
}