import { PROTOCOL_CONTEXT } from '../../../shared/utils/constants.js';
import { sendSSEResponse } from '../../../shared/utils/sse.js';
import {UpsertLspOrder, GetLspOrder} from '../../../shared/db/lsp_dbService.js';
import { kafkaClusters, produceKafkaEvent } from "../../../shared/eda/kafka.js";
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js';
import { v4 as uuidv4 } from 'uuid';

import { protocolSearch,commonProtocolAPIForLsp } from "../../../shared/utils/protocolApis/index.js";
import PROTOCOL_API_URLS from "../../../shared/utils/protocolApis/routes.js";
import ContextFactory from "../../../shared/factories/ContextFactory.js";

import Validator from 'jsonschema';

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

var validator = new Validator.Validator();

class SseProtocol {

    /**
    * on cancel
    * @param {Object} response 
    */
    async onCancel(response) {
        try {
            const messageId = response?.context?.message_id;
            // CallWebhook("lsp_order_process", response)

            // store in db
            var filterQuery = {
                'context.transaction_id': response?.context?.transaction_id,
            }

            var orderDetails = response?.message?.order
            var lspOrderPayload = {
                context : response.context,
                ...orderDetails,
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_CANCEL,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
     * on confirm
     * @param {Object} response 
     */
    async onConfirm(response) {
        try {
            const messageId = response?.context?.message_id;
            // CallWebhook("lsp_order_process", response)
            
            // store in db
            var orderDetails = response?.message?.order

            // console.log("\n===========>>> Lsp order starts upsert in db <<<===========\n")

            var fulfillmentsArray = orderDetails.fulfillments
            for (var i = 0; i < fulfillmentsArray.length; i++) {
                let filterQuery = {
                    'context.transaction_id': response?.context?.transaction_id,
                    'fulfillments' :{ "$elemMatch": { "id": fulfillmentsArray[i].id } }
                }
                let lspOrderFulfillmentPayload ={}

                let present = await GetLspOrder(filterQuery)
                if (present){
                    lspOrderFulfillmentPayload = {
                        "$set": {
                            'fulfillments.$.@ondc/org/awb_no':fulfillmentsArray[i]["@ondc/org/awb_no"],
                            'fulfillments.$.state' : fulfillmentsArray[i]?.state,
                        }
                    }
                }
                else{
                    filterQuery = {
                        'context.transaction_id': response?.context?.transaction_id,
                    }

                    lspOrderFulfillmentPayload = {
                        "$push": {
                            'fulfillments':fulfillmentsArray[i] 
                        }
                    }
                }
                // console.log("\nfulfillment_filter_query ===========>>> ", filterQuery)
                // console.log("lsp_order_fulfillment_payload ===========>>> ", JSON.stringify(lspOrderFulfillmentPayload))
                await UpsertLspOrder(filterQuery, lspOrderFulfillmentPayload)
                
            }
            var filterQuery = {
                'context.transaction_id': response?.context?.transaction_id,
            }
            var lspOrderPayload = {
                context : response.context,
                state : orderDetails.state,
                quote : orderDetails.quote,

            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_CONFIRM,
                response,
            );
            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
    * on init
    * @param {Object} response 
    */
    async onInit(response) {
        try {
            const messageId = response?.context?.message_id;
            // CallWebhook("lsp_order_process", response)

            // store in db
            var orderDetails = response?.message?.order
            
            // console.log("\n===========>>> Lsp order starts upsert in db <<<===========")
            var filterQuery = {
                'context.transaction_id': response?.context?.transaction_id,
                
            }

            var lspOrderPayload = {
                "$set": {
                    'quote':orderDetails?.quote,
                    'payment' : orderDetails?.payment,
                },
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_INIT,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
    * on search
    * @param {Object} response 
    */
    async onSearch(response) {
        try {
            const messageId = response?.context?.message_id;
            
            // CallWebhook("lsp_search", response)

            // let providers
            // try {
            //     providers = response?.message?.catalog?.["bpp/providers"]
                
            // } catch (error) {
            //     return {
            //         message: {
            //             ack: {
            //                 status: "NACK"
            //             }
            //         }
            //     };   
            // }
            let flag = true

            // var validatorResponse = await validator.validate(providers, ProviderValidationSchema);
            // if (validatorResponse["errors"].length == 0) {
            //     flag = true
            // }

            if (flag == true) {
                sendSSEResponse(
                    messageId,
                    PROTOCOL_CONTEXT.ON_SEARCH,
                    response,
                );
            }


            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err        
        }
    }

    /**
    * on status
    * @param {Object} response 
    */
    async onStatus(response) {
        try {
            const messageId = response?.context?.message_id;
            // CallWebhook("lsp_order_process", response)

            
            // store in db
            var orderDetails = response?.message?.order

            // console.log("\n===========>>> Lsp order starts upsert in db <<<===========\n")

            var fulfillmentsArray = orderDetails.fulfillments
            for (var i = 0; i < fulfillmentsArray.length; i++) {
                let filterQuery = {
                    'context.transaction_id': response?.context?.transaction_id,
                    'fulfillments' :{ "$elemMatch": { "id": fulfillmentsArray[i].id } }
                }
                let lspOrderFulfillmentPayload ={}

                let present = await GetLspOrder(filterQuery)
                if (present){
                    lspOrderFulfillmentPayload = {
                        "$set": {
                            'fulfillments.$.state' : fulfillmentsArray[i]?.state,
                            'fulfillments.$.@ondc/org/awb_no':fulfillmentsArray[i]["@ondc/org/awb_no"],
                            'fulfillments.$.tracking' : fulfillmentsArray[i]?.tracking,
                            'fulfillments.$.agent' : fulfillmentsArray[i]?.agent,
                            'fulfillments.$.vehicle' : fulfillmentsArray[i]?.vehicle,
                            'fulfillments.$.@ondc/org/ewaybillno' : fulfillmentsArray[i]["@ondc/org/ewaybillno"],
                            'fulfillments.$.@ondc/org/ebexpirydate' : fulfillmentsArray[i]["@ondc/org/ebexpirydate"],
                        }
                    }
                }
                else{
                    filterQuery = {
                        'context.transaction_id': response?.context?.transaction_id,
                    }

                    lspOrderFulfillmentPayload = {
                        "$push": {
                            'fulfillments':fulfillmentsArray[i] 
                        }
                    }
                }
                // console.log("\nfulfillment_filter_query ===========>>> ", filterQuery)
                // console.log("lsp_order_fulfillment_payload ===========>>> ", JSON.stringify(lspOrderFulfillmentPayload))
                await UpsertLspOrder(filterQuery, lspOrderFulfillmentPayload)
                
            }
            var filterQuery = {
                'context.transaction_id': response?.context?.transaction_id,
            }
            var lspOrderPayload = {
                state : orderDetails.state
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            let lspdetails = await GetLspOrder(filterQuery)

            var data = {
                "meta_data": {
                    "access_template_id": 1,
                    "token_user_id": 1,
                    "company_id": 1,
                    "request_id":String(uuidv4()),
                    "encryption": false,
                    "additional_fields":{
                        "type":"get_order_quote"
                    }

                },
                data:{
                    context :{
                        transaction_id : lspdetails?.parent_context?.transaction_id
                    },
                    message :{
                        order:{
                            state : orderDetails.state
                        }
                    }
                }
            }

            console.log("Status Update ==>> ", JSON.stringify(data))
            produceKafkaEvent(kafkaClusters.Tech, topics.SALES_ORDER_STATUS_UPDATE, data).catch(console.error)

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_STATUS,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
    * on support
    * @param {Object} response 
    */
    async onSupport(response) {
        try {
            const messageId = response?.context?.message_id;
            // CallWebhook("lsp_order_support", response)

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_SUPPORT,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
    
    /**
    * on track
    * @param {Object} response 
    */
    async onTrack(response) {
        try {
            const messageId = response?.context?.message_id;
            // CallWebhook("lsp_order_tracking", response)

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_TRACK,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
    * on update
    * @param {Object} response
    */
    async onUpdate(response) {
        try {
            const messageId = response?.context?.message_id;
            // CallWebhook("lsp_order_process", response)

            // store in db
            var orderDetails = response?.message?.order
            
            // console.log("\n===========>>> Lsp order starts upsert in db <<<===========\n")

            var fulfillmentsArray = orderDetails.fulfillments
            for (var i = 0; i < fulfillmentsArray.length; i++) {
                let filterQuery = {
                    'context.transaction_id': response?.context?.transaction_id,
                    'fulfillments' :{ "$elemMatch": { "id": fulfillmentsArray[i].id } }
                }
                let lspOrderFulfillmentPayload ={}

                let present = await GetLspOrder(filterQuery)
                if (present){
                    lspOrderFulfillmentPayload = {
                        "$set": {
                            'fulfillments.$.state' : fulfillmentsArray[i]?.state,
                            'fulfillments.$.@ondc/org/awb_no':fulfillmentsArray[i]["@ondc/org/awb_no"],
                            'fulfillments.$.tracking' : fulfillmentsArray[i]?.tracking,
                            'fulfillments.$.agent' : fulfillmentsArray[i]?.agent,
                            'fulfillments.$.vehicle' : fulfillmentsArray[i]?.vehicle,
                            'fulfillments.$.@ondc/org/ewaybillno' : fulfillmentsArray[i]["@ondc/org/ewaybillno"],
                            'fulfillments.$.@ondc/org/ebexpirydate' : fulfillmentsArray[i]["@ondc/org/ebexpirydate"],
                        }
                    }
                }
                else{
                    filterQuery = {
                        'context.transaction_id': response?.context?.transaction_id,
                    }

                    lspOrderFulfillmentPayload = {
                        "$push": {
                            'fulfillments':fulfillmentsArray[i] 
                        }
                    }
                }
                // console.log("\nfulfillment_filter_query ===========>>> ", filterQuery)
                // console.log("lsp_order_fulfillment_payload ===========>>> ", JSON.stringify(lspOrderFulfillmentPayload))
                await UpsertLspOrder(filterQuery, lspOrderFulfillmentPayload)
                
            }
            var filterQuery = {
                'context.transaction_id': response?.context?.transaction_id,
            }
            var lspOrderPayload = {
                state : orderDetails.state
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            sendSSEResponse(
                messageId,
                PROTOCOL_CONTEXT.ON_UPDATE,
                response,
            );

            return {
                message: {
                    ack: {
                        status: "ACK"
                    }
                }
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
};

export default SseProtocol;