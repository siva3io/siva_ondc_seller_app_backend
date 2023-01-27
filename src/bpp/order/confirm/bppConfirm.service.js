import { ORDER_STATUS, PAYMENT_COLLECTED_BY, PAYMENT_TYPES, PROTOCOL_CONTEXT, PROTOCOL_PAYMENT } from "../../../shared/utils/constants.js";
import { BAPApiCall, bppProtocolOnConfirm, protocolConfirm } from '../../../shared/utils/protocolApis/index.js';
import { getProviderById, getProductById } from "../../../shared/db/dbService.js";
import { UpsertLspBapUserCartOrder, GetLspBapUserCartOrder, ListLspBapUserCartOrder } from "../../../shared/db/lsp_dbService.js";
import LspMsnService from '../../../lsp/bap/order/init/initOrder.service.js';
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
class BppConfirmService {


    /**
     * bpp confirm order
     * @param {Object} context 
     * @param {Object} order 
     * @returns 
     */
    async bppOnConfirmResponse(uri, orderRequest = {}) {
        try {

            const context = orderRequest.context;
            const message = orderRequest.message;
            context.bpp_uri = process.env.BPP_URL;
            context.bpp_id = process.env.BPP_ID;
            context.action = PROTOCOL_CONTEXT.ON_CONFIRM;
            message.order.state = "Accepted";
            message.order.payment.tl_method =  "http/get";
            message.order.payment.uri =  "https://ondc.transaction.com/payment";
            message.order.payment.params.transaction_id = 2373;
            // message.order.provider = 
            context.timestamp = new Date().toISOString();

            let lspInitAndConfirmResponse = await this.msnLspInitAndConfirm(orderRequest)
            if (lspInitAndConfirmResponse?.errorChecks?.length > 0) {
                let errorSelectRequest = {
                    context: context,
                    ...lspInitAndConfirmResponse?.errorChecks[0]
                }
                await bppProtocolOnConfirm(uri, errorSelectRequest);

            } else {
                let response = lspInitAndConfirmResponse?.response
                for (let i = 0; i < response.length; i++) {
                    let fulfillment_id = response[i].fulfillmentId
                    let delivery_charges = response[i]?.lsp_response?.lsp_details?.quote?.price
                    let breakup_quote = message?.order?.quote?.breakup
                    for (let j = 0; j < breakup_quote.length; j++) {
                        if (breakup_quote[j]["@ondc/org/item_id"] == fulfillment_id && breakup_quote[j]["@ondc/org/title_type"] == "delivery") {
                            breakup_quote[j].price = delivery_charges
                        }
                    }
                }
                const initRequest = {
                    context: context,
                    message: message,
                };
                await bppProtocolOnConfirm(uri, initRequest);
            }
        }
        catch (err) {
            throw err;
        }
    }

    async msnLspInitAndConfirm(orderRequest) {
        try {
            //==== sales order details =================================================
            let salesOrderContext = orderRequest?.context
            let salesOrder = orderRequest.message?.order

            //==== provider details ====================================================
            let providerId = orderRequest?.message?.order?.provider?.id;
            let providerDetails = await getProviderById(providerId)
            let bankDetails = providerDetails?.company_details?.bank_details

            //==== lsp msn details =====================================================
            let filterQuery = {
                parent_transaction_id: orderRequest?.context?.transaction_id,
            }
            let lspOrder = []
            lspOrder = await ListLspBapUserCartOrder(filterQuery)


            // console.log("\n Sales_Order =======>>> ", JSON.stringify(salesOrder));
            // console.log("\n Lsp_Order =======>>> ", JSON.stringify(lspOrder));
            // console.log("\n Provider_Details =======>>> ", JSON.stringify(providerDetails));
            // console.log("\n Bank_Details =======>>> ", JSON.stringify(bankDetails));
            let response = []
            let errorChecks = []

            let salesOrderfulfillments = salesOrder?.fulfillments
            for (let i = 0; i < salesOrderfulfillments.length; i++) {
                let fulfillmentId = salesOrderfulfillments[i]?.id;
                for (var j = 0; j < lspOrder.length; j++) {
                    let msnLspDetails = lspOrder[j]?.msn_lsp_on_search_response
                    if (msnLspDetails?.fulfillment_id == fulfillmentId) {
                        let product = await getProductById(msnLspDetails?.item_ids?.[0])

                        let start_location = {}
                        let end_location = {}
                        start_location = {
                            location: {
                                gps: msnLspDetails?.location?.circle?.gps,
                                address: {
                                    name: msnLspDetails?.location?.address?.name || "Eunimart",
                                    street: msnLspDetails?.location?.address?.street || "",
                                    city: msnLspDetails?.location?.address?.city || "",
                                    state: msnLspDetails?.location?.address?.state || "",
                                    area_code: msnLspDetails?.location?.address?.area_code || "",
                                    door: msnLspDetails?.location?.address?.door || "",
                                    building: msnLspDetails?.location?.address?.building || "",
                                    country: msnLspDetails?.location?.address?.country || "",
                                },
                            },
                            contact: msnLspDetails?.location?.contact,
                        }
                        end_location = { ...salesOrderfulfillments[i]?.end }

                        let lspInitOrderPayload = {
                            context: {
                                bpp_id: msnLspDetails?.lsp_response?.best_lsp_provider?.context?.bpp_id,
                                bpp_uri: msnLspDetails?.lsp_response?.best_lsp_provider?.context?.bpp_uri
                            },
                            message: {
                                order: {
                                    provider: {
                                        id: msnLspDetails?.lsp_response?.best_lsp_provider?.message?.catalog?.["bpp/providers"]?.[0]?.id
                                    },
                                    items: msnLspDetails?.lsp_response?.best_lsp_provider?.message?.catalog?.["bpp/providers"]?.[0]?.items,
                                    fulfillments: [{
                                        id: msnLspDetails?.fulfillment_id,
                                        type: "Prepaid",
                                        start: start_location,
                                        end: end_location,
                                    }],
                                    billing: {
                                        address: start_location?.location?.address || {},
                                        phone: start_location?.contact?.phone || "",
                                        email: start_location?.contact?.email || "",
                                        name: start_location?.contact?.name || "Eunimart",
                                        tax_number: providerDetails?.company_details?.gst_in,
                                    },
                                    payment: {
                                        type: "ON_ORDER",
                                        collected_by: "BAP",
                                        "@ondc/org/settlement_window": "P2D",
                                        "@ondc/org/settlement_details": [
                                            {
                                                settlement_counterparty: "buyer-app",
                                                settlement_type: "upi",
                                                upi_address: bankDetails?.upi_address,
                                                settlement_bank_account_no: bankDetails?.account_number,
                                                settlement_ifsc_code: bankDetails?.ifsc_code
                                            }
                                        ]
                                    }
                                }
                            },
                            order: {
                                parent_context : salesOrderContext,
                                state: "Created",
                                "@ondc/org/linked_order": {
                                    items: [{
                                        category_id: product?.category_id || "",
                                        descriptor: {
                                            name: product?.descriptor?.name || "",
                                        },
                                        quantity: salesOrder?.items?.[0]?.quantity,
                                        price: salesOrder?.quote?.price,
                                    }],
                                    provider: {
                                        descriptor: {
                                            name: product?.provider_id,
                                        }
                                    },
                                    order: {
                                        id: salesOrderContext?.transaction_id,
                                        weight: lspOrder[j]?.search?.message?.intent?.["@ondc/org/payload_details"]?.weight
                                    },
                                },
                                "@ondc/org/settlement_details": [
                                    {
                                        settlement_counterparty: "buyer-app",
                                        settlement_type: "upi",
                                        upi_address: bankDetails?.upi_address,
                                        settlement_bank_account_no: bankDetails?.account_number,
                                        settlement_ifsc_code: bankDetails?.ifsc_code
                                    }
                                ],
                                preferences: msnLspDetails?.preferences,
                            }

                        }
                        // console.log("\n Lsp_Init_Payload =====>>>>> ", JSON.stringify(lspInitOrderPayload));
                        let lspMsnResponse = await lspMsnService.msnInitAndConfirm(lspInitOrderPayload)
                        if (lspMsnResponse?.err_message != null) {
                            errorChecks.push(lspMsnResponse?.err_message)
                        } else {
                            response.push({
                                fulfillmentId: fulfillmentId,
                                lsp_response: lspMsnResponse,
                            })
                        }

                    }
                }
            }
            return { response, errorChecks }
        }
        catch (err) {
            console.log("Error ===== >>>> ", JSON.stringify(err?.response?.data));
            throw err;
        }
    }
}

export default BppConfirmService;
