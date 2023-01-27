import { PROTOCOL_CONTEXT } from "../../../shared/utils/constants.js";
import { bppProtocolOnSelect, protocolSelect, } from "../../../shared/utils/protocolApis/index.js";
import { getProviderById, getProductById, addOrUpdateBPPCartWithTransactionId, } from "../../../shared/db/dbService.js";
import { UpsertLspBapUserCartOrder } from "../../../shared/db/lsp_dbService.js";
import LspMsnService from '../../../lsp/bap/discovery/search.service.js';
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
const lspMsnService = new LspMsnService();

class BppSelectService {

  /**
   *
   * @param {Object} context
   * @param {Object} req
   * @returns
   */
  async bppOnSelectResponse(uri, selectRequest) {
    try {
      const { context: context = {}, message: message = {} } = selectRequest
      context.bpp_uri = process.env.BPP_URL;
      context.bpp_id = process.env.BPP_ID;
      context.action = PROTOCOL_CONTEXT.ON_SELECT;
      context.timestamp = new Date().toISOString();
      context.key = process.env.ENCRYPTION_PUBLIC_KEY
      // context.ttl = "PT4D"
      let products = []
      let items = message?.order?.items
      for (let i = 0; i < items.length; i++) {
        let product = await getProductById(items[i]?.id)
        product["required_quantity"] = items[i]?.quantity?.count
        products.push(product)
      }

      // console.log("message--->",JSON.stringify(message));
      // console.log("products--->",JSON.stringify(products));

      let lspSearchResponse = await this.lspSearch(context, message, products)

      if (lspSearchResponse?.errorChecks?.length > 0) {
        let errorSelectRequest = {
          context: context,
          ...lspSearchResponse?.errorChecks[0]
        }
        // console.log("on_selectRequest", JSON.stringify(errorSelectRequest))
        return await bppProtocolOnSelect(uri, errorSelectRequest);
      }

      let fulfillmentDetails=[{
        id: 'Fulfillment-01',
        "@ondc/org/provider_name": "Loadshare",
        tracking: false,
        "@ondc/org/category": "Delivery",
        "@ondc/org/TAT": "PT1M",
        state: {
          descriptor: {
            name: "Serviceable",
          },
        },
      }];
      if (lspSearchResponse?.response.length > 0){
        fulfillmentDetails = lspSearchResponse?.response.map((lsp) => {
          let mapping_details = {}
          mapping_details = lsp?.lsp_response?.mapping_details
          return {
            id: lsp.fulfillment_id,
            "@ondc/org/provider_name": mapping_details?.provider_name || "Loadshare",
            tracking: false,
            "@ondc/org/category": "Delivery",
            "@ondc/org/TAT": mapping_details?.tat || "PT1M",
            state: {
              descriptor: {
                name: mapping_details?.state || "Serviceable",
              },
            },
          }
        });
      }

      const onSelectRequest = {
        context: context,
        message: {
          order: {
            provider: {
              id: message?.order?.provider?.id
            },
            items: products.map((item) => {
              let itemId = item?.id
              let lspResponse = lspSearchResponse?.response
              let fulfillmentId = 'Fulfillment-01'
              for (let i = 0; i < lspResponse.length; i++) {
                if (lspResponse[i]?.item_ids.includes(itemId)) {
                  fulfillmentId = lspResponse[i]?.fulfillment_id
                  break;
                }
              }
              return {
                fulfillment_id: fulfillmentId,
                id: item?.id
              }
            }),
            fulfillments: fulfillmentDetails,
            quote: await this.calculateQuote(products, lspSearchResponse?.response),
            ttl: "P1D"
          },
        }
      };

      const transactionId = context?.transaction_id;
      let cart = {
        select: selectRequest,
        onselect: onSelectRequest,
        transactionId: transactionId
      };
      await addOrUpdateBPPCartWithTransactionId(transactionId, cart);

      await bppProtocolOnSelect(uri, onSelectRequest);
    } catch (err) {
      console.log("Error =======>>> ", err);
      throw err;
    }
  }


  async calculateQuote(products, lspItemResponseArray = []) {
    let total_price = "0"

    let item_breakup = products.map((item) => {
      let total_value = parseFloat(item?.price?.value) * parseFloat(item?.required_quantity)
      return {
        "@ondc/org/item_id": item?.id,
        "@ondc/org/item_quantity": {
          count: parseInt(item?.required_quantity) || 1,
        },
        title: item?.descriptor?.name,
        "@ondc/org/title_type": "item",
        price: {
          "currency": item?.price?.currency || "INR",
          "value": total_value.toString() || "0"
        },
        item: {
          quantity: item?.quantity,
          price: {
            "currency": item?.price?.currency || "INR",
            "value": parseFloat(item?.price?.value).toString() || "0"
          }
        }
      }
    })
    let tax_breakup = products.map((item) => {
      let tax_amount = 0;
      let sgst_rate = item?.hsn_code_details?.sgst_rate || 0;
      let cgst_rate = item?.hsn_code_details?.cgst_rate || 0;
      let item_price = parseFloat(item?.price?.value) || 0;
      let tot_sgst = sgst_rate / 100 * (item_price) || 0;
      let tot_cgst = cgst_rate / 100 * (item_price) || 0;
      tax_amount += tot_sgst + tot_cgst;
      tax_amount = parseFloat(item?.required_quantity) * tax_amount;
      return {
        "@ondc/org/item_id": item?.id,
        title: "Tax",
        "@ondc/org/title_type": "tax",
        price: {
          currency: "INR",
          value: tax_amount.toString() || "0",
        },
      }
    })
    let delivery_charge_breakup = []
    let packing_charge_breakup = []
    if (lspItemResponseArray.length > 0) {
      delivery_charge_breakup = lspItemResponseArray.map((response) => {
        let fulfillmentId = response?.fulfillment_id
        let mapping_details = response?.lsp_response?.mapping_details
        return {
          "@ondc/org/item_id": fulfillmentId,
          title: "Delivery charges",
          "@ondc/org/title_type": "delivery",
          price: mapping_details?.delivery_charges,
        }
      })

      for (let i = 0; i < lspItemResponseArray.length; i++) {
        let fulfillmentId = lspItemResponseArray[i]?.fulfillment_id
        let totalCostForFulfillment = 0
        let item_ids = lspItemResponseArray[i]?.item_ids || []
        for (let j = 0; j < products.length; j++) {
          let id = products[j]?.id
          if (item_ids.includes(id)) {
            let packaging_cost = products[j]?.package_dimensions?.package_cost || 0;
            totalCostForFulfillment = totalCostForFulfillment + packaging_cost
          }
        }
        packing_charge_breakup.push({
          "@ondc/org/item_id": fulfillmentId,
          title: "Packing charges",
          "@ondc/org/title_type": "packing",
          price: {
            currency: "INR",
            value: totalCostForFulfillment.toString() || "0"
          },
        })
      }
    }
    else {
      delivery_charge_breakup = products.map((item) => {
        return {
          "@ondc/org/item_id": 'Fulfillment-01',
          title: "Delivery charges",
          "@ondc/org/title_type": "delivery",
          price: {
            currency: "INR",
            value: "0",
          },
        }
      })

      let totalPackageCostForFulfillment = 0
      for (let i = 0; i < products.length; i++) {
        let packaging_cost = products[i]?.package_dimensions?.package_cost || 0;
        totalPackageCostForFulfillment = totalPackageCostForFulfillment + packaging_cost
      }
      packing_charge_breakup.push(
        {
          "@ondc/org/item_id": 'Fulfillment-01',
          title: "Packing charges",
          "@ondc/org/title_type": "packing",
          price:{
            currency: "INR",
            value: totalPackageCostForFulfillment.toString() || "0"
          }
        }
      )
    }

    let conviniencefee = [{
      "@ondc/org/item_id": delivery_charge_breakup?.[0]?.["@ondc/org/item_id"],
        title: "Convenience Fee",
        "@ondc/org/title_type": "misc",
        price: {
          currency: "INR",
          value: "0"
        },
    }]

    Array.prototype.push.apply(item_breakup, tax_breakup)
    Array.prototype.push.apply(item_breakup, packing_charge_breakup)
    Array.prototype.push.apply(item_breakup, delivery_charge_breakup)
    Array.prototype.push.apply(item_breakup, conviniencefee)

    item_breakup.map((item) => {
      total_price = (parseFloat(total_price) + parseFloat(item?.price?.value)).toString();
    });

    let quote = {
      price: {
        "currency": "INR",
        "value": total_price.toString() || "0"
      },
      breakup: item_breakup
    };


    return quote
  }

  async lspSearch(context = {}, message = {}, products = []) {
    
    let response = []
    let errorChecks = []
    try {
      let providerId = message?.order?.provider?.id;
      let providerDetails = await getProviderById(providerId)
      // console.log(JSON.stringify(providerDetails));
      let shippingPreference = ""
      let deliveryType = ""
      let deliveryPreferences = ""
      let MapForDeliveryType = {
        "HYPER_LOCAL": "Immediate Delivery",
        "STANDARD_DELIVERY": "Standard Delivery",
        "EXPRESS": "Express Delivery",
        "NEXT_DAY": "Next Day Delivery",
        "SAME_DAY": "Same Day Delivery",
      }
      if (providerDetails?.company_details?.shipping_preference?.lookup_code) {
        shippingPreference = providerDetails?.company_details?.shipping_preference?.lookup_code
      }
      if (providerDetails?.company_details?.delivery_type?.lookup_code) {
        if (providerDetails?.company_details?.delivery_type?.lookup_code) {
          deliveryType = MapForDeliveryType[providerDetails?.company_details?.delivery_type?.lookup_code]
        }
      }
      if (providerDetails?.company_details?.delivery_preferences?.lookup_code) {
        deliveryPreferences = providerDetails?.company_details?.delivery_preferences?.lookup_code
      }

      let preferences = {
        shipping_preferences: shippingPreference,
        delivery_preferences: deliveryPreferences,
        delivery_type: deliveryType,
      }


      if (shippingPreference == "ONDC_LOGISTICS") {
        let itemsArray = message?.order?.items

        let lspSearchDetails = {
          category_id: deliveryType,
          fulfillment_type: "Prepaid",
          start_location: {},
          end_location: message?.order?.fulfillments[0]?.end,
          payloadDetails: {}
        }

        for (let i = 0; i < products.length; i++) {
          let itemId = products[i]?.id;
          console.log(JSON.stringify(products[i]));
          if (products[i]?.["@ondc/org/available_on_cod"]){
            lspSearchDetails.fulfillment_type = "CoD"
          }
          var locationId = itemsArray[i]?.location_id;
          let itemLocationsArray = providerDetails.locations
          let locationDetails = {};

          for (let j = 0; j < itemLocationsArray.length; j++) {
            if (locationId == itemLocationsArray[j]?.id) {
              locationDetails = itemLocationsArray[j]
              // console.log("------------->>>>> ",locationDetails)
              lspSearchDetails.start_location = {
                location: {
                  gps: itemLocationsArray[j]?.circle?.gps,
                  address: {
                    area_code: itemLocationsArray[j]?.address?.area_code
                  }
                },
              }
              break;
            }
          }
          // let pkg_length = (products[i]?.package_dimensions?.package_length / 100)
          // let pkg_breadth = (products[i]?.package_dimensions?.package_width / 100)
          // let pkg_height = (products[i]?.package_dimensions?.package_height / 100)

          lspSearchDetails.payloadDetails = {
            weight: {
              unit: "Kilogram",
              value: products[i]?.package_dimensions?.volumetric_weight || products[i]?.package_dimensions?.package_weight || 0
            },
            // dimensions :{
            //   length :{
            //     unit : "meter",
            //     value : pkg_length,
            //   },
            //   breadth :{
            //     unit : "meter",
            //     value : pkg_breadth
            //   },
            //   height :{
            //     unit : "meter",
            //     value : pkg_height
            //   }
            // }
          }


          let LspSearchRequestMessage = {
            context: {
              country: context?.country,
              city: context?.city,
              state: context?.state,
              ttl: context?.ttl
            },
            message: {
              intent: {
                category: {
                  id: lspSearchDetails.category_id
                },
                fulfillment: {
                  type: lspSearchDetails.fulfillment_type,
                  start: lspSearchDetails.start_location,
                  end: lspSearchDetails.end_location,
                },
                "@ondc/org/payload_details": lspSearchDetails.payloadDetails,
              }
            },
          }
          let lspMsnResponse = await lspMsnService.msnSearch(LspSearchRequestMessage)

          let fulfillmentId = "SIVA-ONDC-STORE-FULFILLMENT-" + (i + 1)

          if (lspMsnResponse?.err_message != null) {
            errorChecks.push(lspMsnResponse?.err_message)
          }
          else {
            let filterQuery = {
              parent_transaction_id: context?.transaction_id,
            }
            let lspBapUserCartPayload = {
              parent_transaction_id: context?.transaction_id,
              search: LspSearchRequestMessage,
              msn_lsp_on_search_response: {
                fulfillment_id: fulfillmentId,
                item_ids :[itemId],
                location_id: locationId,
                location : locationDetails,
                preferences: preferences,
                lsp_response: lspMsnResponse
              }
            }
            console.log(JSON.stringify(lspBapUserCartPayload))
            await UpsertLspBapUserCartOrder(filterQuery, lspBapUserCartPayload)
            // console.log("=======>>> Lsp msn inserted successfully <<<==============");
           
            response.push({
              item_ids: [itemId],
              fulfillment_id: fulfillmentId,
              lsp_response: lspMsnResponse,
            })
          }
        }
        return { response, errorChecks }
      }
      else {
        return { response, errorChecks }
      }
    } catch (err) {
      console.log("Error =======>>> ", err);
      throw err
    }
  }
}

export default BppSelectService;
