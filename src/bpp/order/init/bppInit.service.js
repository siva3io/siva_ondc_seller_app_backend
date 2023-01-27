import {
  PAYMENT_COLLECTED_BY,
  PAYMENT_TYPES,
  PROTOCOL_CONTEXT,
  PAYMENT_COLLECTED_BY_STATUS
} from "../../../shared/utils/constants.js";
import {
  BAPApiCall,
  bppProtocolOnInit,
  protocolInit,
} from "../../../shared/utils/protocolApis/index.js";
import { getProviderById,
  getCartByTransactionId,
  getBPPCartByTransactionId,
  getStateByStateName
} from "../../../shared/db/dbService.js";

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
   * bpp on init order
   * @param {Object} context
   * @param {Object} order
   */
  async bppOnInitResponse(uri, orderRequest = {}) {
    try {
      const context = orderRequest?.context;
      const message = orderRequest?.message;
      context.bpp_uri = process.env.BPP_URL;
      context.bpp_id = process.env.BPP_ID;
      context.action = PROTOCOL_CONTEXT.ON_INIT;
      context.timestamp = new Date().toISOString();
      let items= message?.order?.items
      var cartDetails,quote;
    
      if (orderRequest?.context?.bap_id ===  process.env.BAP_ID){
        cartDetails= await getCartByTransactionId(context?.transaction_id)
        quote = cartDetails?.order?.quote
         
      }else{
        cartDetails= await getBPPCartByTransactionId(context?.transaction_id)
        quote= cartDetails?.onselect?.message?.order?.quote||{}
      }

      let payment_data = message?.order?.payment
      
      // by default eunimart BPP will not act as collector and request BAP to act as collector 
      // if (payment_data["collected_by"] == PAYMENT_COLLECTED_BY.BAP) {
      //   payment_data["@ondc/org/ondc-collected_by_status"] = PAYMENT_COLLECTED_BY_STATUS.AGREE
      // }
      // else if (payment_data["collected_by"] == PAYMENT_COLLECTED_BY.EMPTY){
      //   payment_data["@ondc/org/ondc-collected_by_status"] = PAYMENT_COLLECTED_BY_STATUS.TERMINATE
      // }
      // else if (payment_data["collected_by"] == PAYMENT_COLLECTED_BY.BPP){
      //   payment_data["@ondc/org/ondc-collected_by_status"] = PAYMENT_COLLECTED_BY_STATUS.DISAGREE
      // }
            
      let initRequest = {
        context: context,
        message: {
          order: {
            provider: {
              id: message?.order?.provider?.id || "SIVA-ONDC-STORE-1",
            },
            provider_location: {
              id: message?.order?.provider?.locations?.[0]?.id || "SIVA-ONDC-STORE-1-LOC-1",
            },
            items:message?.order?.items ,
            billing: {
              ...message?.order?.billing,
              created_at: new Date(),
              updated_at: new Date(),
            },
            
            fulfillments: message?.order?.fulfillments,
            quote: quote,
            payment: {
              ...message?.order?.payment,
              collected_by: "BAP",
              type: "ON-ORDER"
            },
            tags: message?.order?.tags ||  {"tags":[{"code":"bap_terms_fee","list":[{"code":"finder_fee_type","value":"percent"},{"code":"finder_fee_amount","value":"3"}]}]}
          },
        }
      };

      let provider = await getProviderById(initRequest?.message?.order?.provider?.id)
      
      var bpp_terms_liability = {
        "code":"bpp_terms_liability",
        "list":
        [
          {
            "code":"max_liability_cap",
            "value":"10000"
          },
          {
            "code":"max_liability",
            "value":"2"
          }
        ]
      }
      
      let provider_locations = provider?.locations || []
      let state = "TS"
      if (provider_locations.length){
        let state_details   = getStateByStateName(provider_locations[0]["address"]["state"])
        state = state_details?.state_code || "TS"
      }
      var bpp_terms_arbitration = {
        "code":"bpp_terms_arbitration",
        "list":
        [
          {
            "code":"mandatory_arbitration",
            "value":"false"
          },
          {
            "code":"court_jurisdiction",
            "value":state
          }
        ]
      }
      
      var bpp_terms_charges = {
        "code":"bpp_terms_charges",
        "list":
        [
          {
            "code":"delay_interest",
            "value":"1000"
          }
        ]
      }
      
      var bpp_seller_gst = {
        "code":"bpp_seller_gst",
        "list":
        [
          {
            "code":"GST",
            "value":provider?.company_details?.gst_in
          }
        ]
      }
      let is_percentage = false
      let value = 0
      if(message?.order?.tags){
        let tags = message.order.tags
        for (let tag of tags){
            if(tag?.code === "bap_terms_fee" && tag?.list){
                for (let listElement of tag?.list){
                    if(listElement?.code === "finder_fee_type" && listElement?.value === "percent"){
                        is_percentage = true
                    }
                    if(listElement?.code === "finder_fee_amount"){
                        value = parseFloat(listElement?.value)
                    }
                }
            }else{

            }
        }
      }
      let buyer_acceptance_payload = {}

      if(is_percentage && value < 5 && value >=0){
        buyer_acceptance_payload = {
          code:"accept",
          value:"Y"}
      }else{
        buyer_acceptance_payload = {
          code:"accept",
          value:"N"}
      }
      
      initRequest.message.order['tags'] = initRequest.message.order.tags || []
      if (initRequest.message.order['tags'].length){
        initRequest.message.order['tags'][0]['list'].push(buyer_acceptance_payload)
        initRequest.message.order['tags'].push(bpp_terms_liability)
        initRequest.message.order['tags'].push(bpp_terms_arbitration)
        initRequest.message.order['tags'].push(bpp_terms_charges)
        initRequest.message.order['tags'].push(bpp_seller_gst)
      }      
      // initRequest.message.order.payment["@ondc/org/collected_by_status"] = "Agree";

      // console.log("payment",JSON.stringify(initRequest?.message?.order?.payment));
      if(!initRequest.message.order.payment){
        initRequest.message.order.payment={}
      }
        if(!initRequest.message.order.payment['@ondc/org/settlement_details']){
          initRequest.message.order.payment['@ondc/org/settlement_details']=[{}]
        }
    
      // initRequest.message.order.payment['@ondc/org/settlement_details'][0]['bank_name'] = provider?.company_details?.bank_details?.bank_name
      // initRequest.message.order.payment['@ondc/org/settlement_details'][0]['branch_name'] = provider?.company_details?.bank_details?.branch_name
      // initRequest.message.order.payment['@ondc/org/settlement_details'][0]['settlement_bank_account_no'] = provider?.company_details?.bank_details?.account_number
      // initRequest.message.order.payment['@ondc/org/settlement_details'][0]['settlement_ifsc_code'] = provider?.company_details?.bank_details?.ifsc_code
      // initRequest.message.order.payment['@ondc/org/settlement_details'][0]['beneficiary_name'] = provider?.company_details?.bank_details?.holder_name
      initRequest.message.order.payment['@ondc/org/settlement_details'][0]['upi_address'] = "8712799171@jupiteraxis"   // provider?.company_details?.bank_details?.upi_address
      initRequest.message.order.payment['@ondc/org/settlement_details'][0]['settlement_counterparty'] = "buyer-app"
      initRequest.message.order.payment['@ondc/org/settlement_details'][0]['settlement_phase'] = "sale-amount"
      initRequest.message.order.payment['@ondc/org/settlement_details'][0]["settlement_type"] =  "upi"
      
      // @ondc/org/buyer_app_finder_fee_type": "Percent", // missing
        // "@ondc/org/buyer_app_finder_fee_amount": "0.0", // missing
        // "@ondc/org/withholding_amount": "0.0", // missing
        // "@ondc/org/return_window": "0", // missing
        // "@ondc/org/settlement_basis": "Collection",  // missing
        // "@ondc/org/settlement_window": "P2D",  // missing
        
      initRequest.message.order.payment['@ondc/org/buyer_app_finder_fee_type']=  process.env.BAP_FINDER_FEE_TYPE
      initRequest.message.order.payment['@ondc/org/buyer_app_finder_fee_amount']=  process.env.BAP_FINDER_FEE_AMOUNT
      initRequest.message.order.payment['@ondc/org/withholding_amount']=  "0.0"
      initRequest.message.order.payment['@ondc/org/return_window']=  "P7D"
      initRequest.message.order.payment['@ondc/org/settlement_basis']=   "Collection"
      initRequest.message.order.payment['@ondc/org/settlement_window']=  "P7D"
      

      // console.log("::INIT::", JSON.stringify(initRequest))

      await bppProtocolOnInit(uri, initRequest);
    } catch (err) {
      throw err;
    }
  }
}

export default BppInitService;
