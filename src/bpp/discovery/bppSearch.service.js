import { searchProduct } from "../../shared/db/dbService.js";
import { PROTOCOL_CONTEXT } from "../../shared/utils/constants.js";
import { protocolSearch, bppProtocolOnSearch, BAPApiCall } from "../../shared/utils/protocolApis/index.js";
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

  /**
     * 
     * @param {Object} data 
     * @param {Object} req 
     * @returns 
     */
  async generateSearchPayload(providersArray) {
    try {
      // let providersArray = []

    for (let i = 0; i < providersArray.length; i++) {
    }


      // for (let i = 0; i < response.length; i++) {
      //   var tempData = response[i]
      //   var processDic = {
      //     id: tempData?.provider_details?.id,
      //     descriptor: tempData?.provider_details?.descriptor,
      //     ttl: tempData?.provider_details?.ttl,
      //     locations: tempData?.provider_details?.locations,
      //     "items": []
      //   }
        
      //   let itemDetails = {
      //     "id": tempData["id"],
      //     "descriptor": tempData["descriptor"],
      //     "quantity": tempData["quantity"],
      //     "price": tempData["price"],
      //     "category_id": tempData["category_id"],
      //     "fulfillment_id": tempData["fulfillment_id"],
      //     "location_id": tempData["provider_details"]?.["locations"]?.[0]?.["id"],
      //     "@ondc/org/returnable": tempData["is_returnable"].toString(),
      //     "@ondc/org/cancellable": tempData["is_cancellable"].toString(),
      //     "@ondc/org/seller_pickup_return": tempData["is_seller_pickup_return"].toString(),
      //     "@ondc/org/available_on_cod": tempData["is_available_on_cod"].toString(),
      //     "@ondc/org/contact_details_consumer_care": tempData["contact_details_consumer_care"].toString()
      //   }

      //   if((tempData?.category_id.startsWith("RET-10")&& !tempData?.category_id.startsWith("RET-10-17"))||(tempData?.category_id=="Packaged Foods")){
      //     itemDetails["@ondc/org/statutory_reqs_packaged_commodities"]= tempData["statutory_reqs_packaged_commodities"]
      //     itemDetails["@ondc/org/statutory_reqs_prepackaged_food"]= tempData["statutory_reqs_prepackaged_food"]

      //   }
      //   if(tempData?.["time_to_ship"]){
      //     itemDetails["@ondc/org/time_to_ship"] = tempData["time_to_ship"].toString()
      //   }
        
      //   if(tempData?.category_id.startsWith("RET-10-17") ||   tempData.category_id=="Fruits and Vegetables"){
      //     itemDetails["@ondc/org/mandatory_reqs_veggies_fruits"] = tempData["mandatory_reqs_veggies_fruits"]
      //   }
        
      //   if (tempData?.category_id.startsWith("RET-10") || tempData?.category_id.startsWith("RET-11") || tempData?.category_id=="Packaged Foods" || tempData?.category_id=="South Indian") {
      //     if(tempData?.provider_details?.fssai_license_no){
      //     processDic["@ondc/org/fssai_license_no"] = tempData?.provider_details?.fssai_license_no
      //     }
      //     itemDetails["tags"]= tempData["tags"]
      //   }
        
      //   if(itemDetails?.["@ondc/org/returnable"]=="true"||itemDetails?.["@ondc/org/returnable"]==true){
      //     itemDetails["@ondc/org/return_window"] = tempData["return_window"]
      //   }
     
      //   if (tempData.offer_details && tempData?.offer_details?.value!="") {
      //     processDic.offers =
      //       [
      //         {
      //           "id": tempData?.["offer_details"]?.["offer_id"],
      //           "descriptor":
      //           {
      //             "name": tempData?.["offer_details"]?.["title"],
      //             "short_desc": tempData?.["offer_details"]?.["title"],
      //             "long_desc": tempData?.["offer_details"]?.["title"],
      //             "images":
      //               [
      //                 {
      //                   "url": "https://abc.com/images/207.png"
      //                 }
      //               ]
      //           },
      //           "location_ids":
      //             [
      //             ],
      //           "category_ids":
      //             [
      //             ],
      //           "item_ids":
      //             [
      //             ],
      //           "time":
      //           {
      //             "label": "validity",
      //             "range":
      //             {
      //               "start":  tempData?.["offer_details"]?.["valid_from"],
      //               "end":  tempData?.["offer_details"]?.["valid_to"]
      //             }
      //           }
      //         }
      //       ]
      //     itemDetails["price"].offered_value = (parseFloat(tempData["price"]["value"])-parseFloat(tempData?.["offer_details"]?.["value"])).toString()
      //   }
        
      //   let index = -1
      //   for (let j = 0; j < providersArray.length; j++) {
      //     if (processDic?.id == providersArray[j].id) {
      //       index = j;
      //       break;
      //     }
      //   }
      //   if (index == -1) {
      //     processDic.items.push(itemDetails)
      //     providersArray.push(processDic)
      //   }
      //   else {
      //     providersArray[index].items.push(itemDetails)
      //   }
      // }

      return providersArray
    }
    catch (err) {
      throw err;
    }
  }

  /**
     * 
     * @param {Object} context 
     * @param {Object} req 
     * @returns 
     */
  async bppOnSearchResults(uri, context = {}, message = {}, providers_meta_data) {
    try {
      context.bpp_uri = process.env.BPP_URL;
      context.bpp_id = process.env.BPP_ID;
      context.action = PROTOCOL_CONTEXT.ON_SEARCH;
      context.timestamp = new Date().toISOString();

      var search_string = message?.intent?.item?.descriptor?.name
      var category_string = message?.intent?.category?.descriptor?.name
      var category_id_string = message?.intent?.category?.id
      var provider_string = message?.intent?.provider?.descriptor?.name
     
      for(let i = 0; i < providers_meta_data.length; i++) {
        let locs = []
        for (let loc of providers_meta_data[i].locations){
          locs.push(loc.id)
        }

        const query = {
          ...(search_string && {"descriptor.name": new RegExp(search_string, "i")}),
          ...(category_string && { category_id : category_string}),
          ...(category_id_string && { category_id : category_id_string}),
          ...(provider_string && { provider_id : new RegExp(provider_string, "i")}),
          ...(providers_meta_data[i].locations && { location_ids : { "$in":locs }}),
          ...(providers_meta_data[i].id && { provider_id : providers_meta_data[i].id})
          }
          
          var products = await searchProduct(query)
          if (products.length){
            providers_meta_data[i]["items"] = products
          }else{
            providers_meta_data.splice(i, 1)
          }
          
      }

      // generate bpp/providers payload
      // var bpp_providers = await this.generateSearchPayload(providers_meta_data)

      var default_fulfillments = [
        {
          "id": "1",
          "type": "Delivery"
        }
      ]

      var default_descriptor = {
        "name": "Siva store",
        "short_desc": "Siva for ONDC",
        "long_desc": "Siva is a universal open-source platform for commerce and supply chain. With its Platform-as-a-Service and integration-Platform-as-a-service capabilities, Siva is a truly interoperable solution, with more than 100 ready-made solutions at the door.",
        "images": [
          "https://siva3.io/web/image/website/1/logo/Siva%20%7C%20Commerce%203.0?unique=0754639"
        ],
        "symbol": "https://siva3.io/web/image/website/1/logo/Siva%20%7C%20Commerce%203.0?unique=0754639"
      }
      
      delete providers_meta_data[0]["_id"]
      const searchRequest = {
        context: context,
        message: {
          "catalog": {
            "bpp/fulfillments": default_fulfillments,
            "bpp/descriptor": default_descriptor,
            "bpp/providers": providers_meta_data
          }
        }
      }

      const response = await bppProtocolOnSearch(uri, searchRequest);

      // return { context: context, message: response.message };
    }
    catch (err) {
      throw err;
    }
  }
}

export default BppSearchService;
