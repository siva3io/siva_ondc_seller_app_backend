import BppSearchService from "./bppSearch.service.js";
import LSPValidator from "../../../shared/utils/validations/lsp_validations/validations.js"
import { redisClient } from "../../../shared/database/redis.js";
import PROTOCOL_API_URLS from "../../../shared/utils/protocolApis/routes.js";
import ContextFactory from '../../../shared/factories/ContextFactory.js';
import { protocolSearch,commonProtocolAPIForLsp } from '../../../shared/utils/protocolApis/index.js';
import { PROTOCOL_CONTEXT} from '../../../shared/utils/constants.js';
import moment from "moment";
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
const bppSearchService = new BppSearchService();
var lspValidator = new LSPValidator();

class SearchService {

//=================== ONDC ======================================================================================
    /**
    * search
    * @param {Object} searchRequest
    */

     async ONDCSearch(searchRequest = {}, res) {
        try {

            //Validation
            var validation_flag = await lspValidator.validateSearch(searchRequest)

            if (!validation_flag) {
                return {
                        context : searchRequest.context,
                        message: {
                            "ack": { "status": "NACK" },
                            "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
                        }
                    }
            }

            return await bppSearchService.ONDCSearch(searchRequest);

        }
        catch (err) {
            return err;
        }
    }

//=================== LSP ======================================================================================

    async ONDCLspSearchEvent(searchRequest = {}) {
        try {

            //Validation
            // var validation_flag = await lspValidator.validateSearch(searchRequest)

            // if (!validation_flag) {
            //     return {
            //             context : searchRequest.context,
            //             message: {
            //                 "ack": { "status": "NACK" },
            //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
            //             }
            //         }
            // }
            return await bppSearchService.ONDCLspSearchEvent(searchRequest);
        }
        catch (err) {
            return err
        }
    }

    async msnSearch(searchRequest = {}) {
        try {
            
            const { context: requestContext = {}, message = {}, preferences ={}} = searchRequest;

            const contextFactory = new ContextFactory();
            const protocolContext = contextFactory.create({
                domain:process.env.LSP_DOMAIN,
                country: requestContext?.country,
                city: requestContext?.city,
                state : requestContext?.state,
                action: PROTOCOL_CONTEXT?.SEARCH,
                bap_id: requestContext.bap_id ? requestContext?.bap_id : process.env.LSP_BAP_ID,
                bap_uri:requestContext.bap_uri ? requestContext?.bap_uri :process.env.LSP_BAP_URL,
                ttl: requestContext?.ttl,
            });

            let data = {
                context : protocolContext,
                message : message
            }
            let messageId = protocolContext?.message_id
            // await redisClient.lPush("lsp.on_search."+messageId, JSON.stringify({"context":{"action":"on_search","domain":"nic2004:60232","country":"IND","city":"std:080","core_version":"1.0.0","bap_id":"ondc.eunimart.com/api/v1/ondc/lsp_bap/eunimart_lsp_bap","bap_uri":"https://ondc.eunimart.com/api/v1/ondc/lsp_bap/eunimart_lsp_bap/","bpp_id":"flash-api.staging.shadowfax.in","bpp_uri":"https://flash-api.staging.shadowfax.in/ondc/v1","transaction_id":"92bdc188-fcb9-43f6-97b2-a58c079ab30a","message_id":"21827540-bf31-438f-aacc-623add0b24f0","timestamp":"2023-01-03T12:22:07.954625+00:00"},"message":{"catalog":{"bpp/descriptor":{"name":"Eunimart"},"bpp/providers":[{"id":"SFX","descriptor":{"name":"Eunimart","short_desc":"SFX","long_desc":"Shadowfax"},"categories":[{"id":"Immediate Delivery","time":{"lable":"TAT","duration":"PT45M"}}],"items":[{"id":"SFXImmediateDelivery","category_id":"Immediate Delivery","descriptor":{"name":"Immediate Delivery","short_desc":"Immediate Delivery for F&B","long_desc":"Immediate Delivery for F&B"},"price":{"currency":"INR","value":"5000.0"}}]}]}}}))
            // await redisClient.lPush("lsp.on_search."+messageId, JSON.stringify({"context":{"domain":"nic2004:60232","country":"IND","city":"std:080","action":"on_search","core_version":"1.0.0","bap_id":"ondc.eunimart.com","bap_uri":"https://ondc.eunimart.com/api/v1/ondc/lsp_bap/eunimart_lsp_bap/","transaction_id":"b8756b02-848f-4bdb-b8df-b47060328296","ttl":"PT30s","message_id":"379a858a-1e57-4a1a-a916-33d2e203532d","timestamp":"2023-01-08T03:53:46.885Z","bpp_uri":"https://ondc-preprod.loadshare.net/logistics/bpp","bpp_id":"ondc-preprod.loadshare.net"},"message":{"catalog":{"bpp/descriptor":{"name":"LoadShare Delivery"},"bpp/providers":[{"id":"loadshare@ondc-preprod.loadshare.net","descriptor":{"name":"LoadShare Networks","long_desc":"LoadShare Networks Private Limited","short_desc":"LoadShare Networks Private Limited"},"categories":[{"id":"Immediate Delivery","time":{"label":"TAT","duration":"PT1H"}}],"items":[{"id":"express","category_id":"Immediate Delivery","descriptor":{"name":"Immediate Delivery","long_desc":"Upto 45 mins for Delivery","short_desc":"Upto 45 mins for Delivery"},"price":{"currency":"INR","value":"39"}}]}]}}}))
            await commonProtocolAPIForLsp(process.env.PROTOCOL_BASE_URL, PROTOCOL_API_URLS.SEARCH, data,process.env.LSP_BAP_ID,process.env.LSP_BAP_UNIQUE_KEY_ID,process.env.LSP_BAP_PRIVATE_KEY);

            let categoryId =  message?.intent?.category?.id || "Immediate Delivery"
            let cheapestPrice = 0
            let fastestTime = 0
            
            let BestLspProvider

            let lspResponseMappingDetails ={
                provider_name: "Provider_Name",
                category_type: categoryId,  //prepaid or CoD
                tat: "PT1M",
                state: "Serviceable",
                delivery_charges:{
                    currency: "INR",
                    value: 0
                },
                "@ondc/org/payload_details":message?.intent?.["@ondc/org/payload_details"] || {},
            }

            await new Promise(r => setTimeout(r, 10000));
            let result = await redisClient.lRange("lsp.on_search."+messageId, 0, -1)
            await redisClient.del("lsp.on_search."+messageId)
            if (result.length == 0){
                let errMessage = {
                    message:{
                        ack: {
                            status: "NACK",
                        }
                    },
                    error:{
                        code : "60004",
                        message : "Delivery Partners not available"
                    }
                }
                
                return {
                    best_lsp_provider : null,
                    mapping_details : null,
                    err_message : errMessage,
                };
            }
            
            let sortBy = preferences?.deliveryPreferences || "CHEAPEST"
            // let sortBy = "fastest"

            for (let i = 0; i < result.length; i++){
                let lsp = JSON.parse(result[i]);
                if (lsp?.error){
                    continue
                }
                let providerDetails = lsp?.message?.catalog["bpp/providers"]
                if (typeof providerDetails === 'undefined' || providerDetails.length == 0){
                    continue;
                }
                for (let j = 0; j < providerDetails.length; j++){
                    let itemDetails = providerDetails[j]?.items
                    if (typeof itemDetails === 'undefined' || itemDetails.length == 0){
                        continue;
                    }
                    let categories = providerDetails[j]?.categories
                    if (typeof categories === 'undefined' || categories.length == 0){
                        continue;
                    }
                    if (sortBy == 'CHEAPEST') {
                        for (let k = 0; k < itemDetails.length; k++){
                            let itemCategoryId = itemDetails[k]?.category_id
                            let deliveryChargeinString = itemDetails[k]?.price?.value
                            if (typeof itemCategoryId === 'undefined' || typeof deliveryChargeinString === 'undefined'){
                                continue;
                            }
                            let deliveryChargeinFloat = parseFloat(deliveryChargeinString)
                                if (cheapestPrice == 0 || deliveryChargeinFloat < cheapestPrice){
        
                                    BestLspProvider = lsp
                                    cheapestPrice = deliveryChargeinFloat
        
                                    lspResponseMappingDetails.provider_name = providerDetails[j]?.descriptor?.name
                                    let categories = providerDetails[j]?.categories
                                    for (let l = 0; l < categories.length; l++){
                                        if (categories[l].id == categoryId){
                                            lspResponseMappingDetails.tat = categories[l]?.time?.duration
                                        }
                                    }
                                    lspResponseMappingDetails.delivery_charges = itemDetails[k]?.price
                            }
                        }
                        continue
                    }
                    if (sortBy == 'FASTEST') {
                        for (let k = 0; k < categories.length; k++){
                            if (typeof categories[k].time?.duration === 'undefined' || categories[k].time?.duration === ''){
                                continue
                            }
                            let timeDuration = moment.duration(categories[k].time?.duration).asSeconds()
                            if (fastestTime == 0 || timeDuration < fastestTime){
                                BestLspProvider = lsp
                                fastestTime = timeDuration
                                lspResponseMappingDetails.category_type = categories[k].id
                                lspResponseMappingDetails.provider_name = providerDetails[j]?.descriptor?.name
                                lspResponseMappingDetails.tat = categories[k].time?.duration
                                lspResponseMappingDetails.delivery_charges = itemDetails[0]?.price
                            }
                        }
                    }
                }
            }
            console.log("\n============================== Lsp Provider Details===================================");
            console.log("Category Id =====>>> ", lspResponseMappingDetails.category_type);
            console.log("Price =====>>> ", lspResponseMappingDetails.delivery_charges);
            console.log("Lsp Details =====>>>", JSON.stringify(BestLspProvider));
            console.log("Lsp Response Mapping Details =====>>>", JSON.stringify(lspResponseMappingDetails));
            console.log("\n=========================================================================================");
            if (lspResponseMappingDetails.provider_name == "Provider_Name"){
                let errMessage = {
                    message:{
                        ack: {
                            status: "NACK",
                        }
                    },
                    error:{
                        code : "60004",
                        message : "Delivery Partners not available"
                    }
                }
                
                return {
                    best_lsp_provider : null,
                    mapping_details : null,
                    err_message : errMessage,
                };
            }
            return {
                best_lsp_provider : BestLspProvider,
                mapping_details : lspResponseMappingDetails,
                err_message : null,
            };
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            throw err;
        }
    }
}

export default SearchService;
