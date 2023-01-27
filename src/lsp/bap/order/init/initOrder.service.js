//@ts-check
import LSPValidator from "../../../../shared/utils/validations/lsp_validations/validations.js"
import BppInitService from "./bppInit.service.js";
import {UpsertLspOrder, GetLspOrder} from '../../../../shared/db/lsp_dbService.js';
import { redisClient } from '../../../../shared/database/redis.js';
import PROTOCOL_API_URLS from '../../../../shared/utils/protocolApis/routes.js';
import ContextFactory from '../../../../shared/factories/ContextFactory.js';
import { protocolSearch, commonProtocolAPIForLsp } from '../../../../shared/utils/protocolApis/index.js';
import { PROTOCOL_CONTEXT} from '../../../../shared/utils/constants.js';

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

const bppInitService = new BppInitService();
const lspValidator = new LSPValidator();

class InitOrderService {

    async ONDCLspInitOrderEvent(orderRequest) {
        try {
            const { context: requestContext = {}, message = {} } = orderRequest;
            
            //Validation
            // var validation_flag = await lspValidator.validateInit(orderRequest)

            // if (!validation_flag) {
            //     return {
            //             context : orderRequest.context,
            //             message: {
            //                 "ack": { "status": "NACK" },
            //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
            //             }
            //         }
            // }

            var orderDetails = message?.order
            var lspOrderPayload = {
                context : requestContext,
                ...orderDetails,
                created_by : message?.created_by,
            }
            var filterQuery = {
                'context.transaction_id': requestContext?.transaction_id,
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            const bppResponse = await bppInitService.ONDCLspInit(
                requestContext.bpp_uri,
                orderRequest
            );

            return bppResponse;
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
    * init order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
     async ONDCInitOrder(orderRequest, isMultiSellerRequest = false) {
        try {

            const { context: requestContext = {}, message = {} } = orderRequest;            
            //TODO
            //Validation
            // var validation_flag = await lspValidator.validateInit(orderRequest)

            // if (!validation_flag) {
            //     return {
            //             context : orderRequest.context,
            //             message: {
            //                 "ack": { "status": "NACK" },
            //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
            //             }
            //         }
            // }

            const bppResponse = await bppInitService.ONDCInit(
                requestContext.bpp_uri,
                orderRequest
            );

            return bppResponse;
        }
        catch (err) {
            throw err;
        }
    }


    async msnInitAndConfirm(orderRequest = {}) {
        try {
            var { context: requestContext = {}, message = {}, order = {}} = orderRequest;

            var contextFactory = new ContextFactory();
            var protocolContext = contextFactory.create({
                domain:process.env.LSP_DOMAIN,
                country: requestContext?.country,
                city: requestContext?.city,
                state : requestContext?.state,
                action: PROTOCOL_CONTEXT?.INIT,
                bap_id: requestContext.bap_id ? requestContext?.bap_id : process.env.LSP_BAP_ID,
                bap_uri:requestContext.bap_uri ? requestContext?.bap_uri :process.env.LSP_BAP_URL,
                bppId: requestContext.bpp_id,
                bppUrl: requestContext.bpp_uri,
                // transactionId : requestContext.transaction_id,
                ttl: requestContext?.ttl,
            });

            let data = {
                context : protocolContext,
                message : message
            }
            let transactionId = data?.context?.transaction_id
            var orderDetails = data?.message?.order
            var lspOrderPayload = {
                parent_context : order?.parent_context,
                context : data?.context,
                ...orderDetails,
            }
            var filterQuery = {
                'context.transaction_id': transactionId,
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            let response = await commonProtocolAPIForLsp(data?.context?.bpp_uri, PROTOCOL_API_URLS.INIT, data,process.env.LSP_BAP_ID,process.env.LSP_BAP_UNIQUE_KEY_ID,process.env.LSP_BAP_PRIVATE_KEY);
            
            if (response?.message?.ack?.status != "ACK"){
                console.log("\n<<<<<======= NACK for Lsp Init ========>>>>\n")                
                return {
                    lsp_details : null,
                    mapping_details : null,
                    err_message : response,
                }; 
            }

            await new Promise(r => setTimeout(r, 5000));

            let onInitResponse = await redisClient.get("lsp.on_init."+protocolContext?.message_id);
            let parsedOnInitResponse = JSON.parse(onInitResponse);
            await redisClient.del("lsp.on_init."+protocolContext?.message_id)
            if (parsedOnInitResponse.error){
                console.log("\n<<<<<======= NACK for Lsp On Init ========>>>>\n")                
                return {
                    lsp_details : null,
                    mapping_details : null,
                    err_message : parsedOnInitResponse?.error,
                };
            }

            filterQuery = {
                'context.transaction_id': transactionId,
            }

            let lspData = await GetLspOrder(filterQuery);

            protocolContext = contextFactory.create({
                domain:process.env.LSP_DOMAIN,
                country: requestContext?.country,
                city: requestContext?.city,
                state : requestContext?.state,
                action: PROTOCOL_CONTEXT?.CONFIRM,
                bap_id: requestContext.bap_id ? requestContext?.bap_id : process.env.LSP_BAP_ID,
                bap_uri:requestContext.bap_uri ? requestContext?.bap_uri :process.env.LSP_BAP_URL,
                bppId: requestContext.bpp_id,
                bppUrl: requestContext.bpp_uri,
                transactionId : transactionId,
                ttl: requestContext?.ttl,
            });

            message.order.quote = lspData?.quote;
            message.order.payment = lspData?.payment;
            message.order.fulfillments[0].start.person={
                name : message?.order?.fulfillments[0]?.start?.location?.address?.name
            }
            message.order.fulfillments[0].end.person={
                name : message?.order?.fulfillments[0]?.end?.location?.address?.name
            }
            if (order?.preferences?.delivery_type == "Immediate Delivery"){
                message.order.fulfillments[0].tags= {
                    "@ondc/org/order_ready_to_ship": "Yes"
                }
            }
            else{
                message.order.fulfillments[0].tags= {
                    "@ondc/org/order_ready_to_ship": "No"
                }
            }
            message.order.id = lspData?.id;
            message.order.state = order?.state;
            message.order["@ondc/org/linked_order"] = order?.["@ondc/org/linked_order"];
            message.order.payment["@ondc/org/settlement_details"] = order?.["@ondc/org/settlement_details"]

            data = {
                context : protocolContext,
                message : message
            }

            orderDetails = data?.message?.order
            lspOrderPayload = {
                context : data?.context,
                ...orderDetails,
            }
            filterQuery = {
                'context.transaction_id': transactionId,
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            response = await commonProtocolAPIForLsp(data?.context?.bpp_uri, PROTOCOL_API_URLS.CONFIRM, data,process.env.LSP_BAP_ID,process.env.LSP_BAP_UNIQUE_KEY_ID,process.env.LSP_BAP_PRIVATE_KEY);
            
            if (response?.message?.ack?.status != "ACK"){
                console.log("\n<<<<<======= NACK for Lsp Confirm ========>>>>\n")                
                return {
                    lsp_details : null,
                    mapping_details : null,
                    err_message : response,
                }; 
            }

            await new Promise(r => setTimeout(r, 5000));

            let onConfirmResponse = await redisClient.get("lsp.on_confirm."+protocolContext?.message_id);
            let parsedOnConfirmResponse = JSON.parse(onConfirmResponse);
            await redisClient.del("lsp.on_confirm."+protocolContext?.message_id)
            if (parsedOnConfirmResponse?.error){
                console.log("\n<<<<<======= NACK for Lsp On Confirm ========>>>>\n")                
                return {
                    lsp_details : null,
                    mapping_details : null,
                    err_message : parsedOnConfirmResponse?.error,
                };
            }

            lspData = await GetLspOrder(filterQuery);

            console.log("\n============================== Lsp Msn Init & Confirm Response  ===================================");
            console.log("Lsp Order Details =====>>>", JSON.stringify(lspData));
            console.log("\n=========================================================================================");
            
            return {
                lsp_details : lspData,
                mapping_details : null,
                err_message : null,
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            throw err;
        }
    }
}

export default InitOrderService;
