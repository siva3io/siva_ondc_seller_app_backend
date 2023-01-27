import { PROTOCOL_CONTEXT } from "../../../shared/utils/constants.js";
import { BAPApiCall, bppProtocolOnUpdate, protocolUpdate } from "../../../shared/utils/protocolApis/index.js";
import PROTOCOL_API_URLS from "../../../shared/utils/protocolApis/routes.js";
import { addOrUpdateOrderWithTransactionId, getOrderById, getOrderByTransactionId, getProductById } from "../../../shared/db/dbService.js";
import { kafkaClusters, produceKafkaEvent } from '../../../shared/eda/kafka.js'
import { topics } from '../../../shared/eda/consumerInit/initConsumer.js'
import { redisSubscribe } from "../../../shared/database/redis.js";
import BppSelectService from '../select/bppSelect.service.js';
import { v4 as uuidv4 } from 'uuid';
import { GetBppOrder, UpdateBppOrder } from "../../../shared/db/bpp_dbService.js";
import Order from "../../../shared/db/order.js";
import { cancellation_reason } from "../../../shared/db/cancellation_reason.js";
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
const bppSelectService = new BppSelectService();

class BppUpdateService {

    /**
     * 
     * @param {Object} context 
     * @param {String} orderId 
     * @param {String} cancellationReasonId 
     * @returns 
     */
    async update(uri, context, update_target, order) {
        try {

            const updateRequest = {
                context: context,
                message: {
                    update_target: update_target,
                    order: order
                }
            }

            const response = await BAPApiCall(context.bap_uri, PROTOCOL_API_URLS.UPDATE, updateRequest);
            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * 
     * @param {Object} context 
     * @param {String} orderId 
     * @param {String} cancellationReasonId 
     * @returns 
     */
    async ONDCUpdate(uri, orderRequest) {
        try {

            const response = await protocolUpdate(uri, orderRequest);
            return { context: response.context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

    /**
    * bpp on update order
    * @param {Object} context
    * @param {Object} order
    * @param {String} parentOrderId
    */
    async bppOnUpdateResponse(uri, requestContext, orderDetails, cancelOrderRequest) {
        try {
            const { context: context = {}, message: message = {} } = cancelOrderRequest || {};
            context.bpp_uri = process.env.BPP_URL;
            context.bpp_id = process.env.BPP_ID;
            context.action = PROTOCOL_CONTEXT.ON_UPDATE;
            context.message_id = context?.message_id;
            context.timestamp = new Date().toISOString();
            // console.log(">>>>>>>>", JSON.stringify(orderDetails?.ondc_context?.message?.order?.quote));

            const OnUpdateRequest = {
                context: context,
                message: {
                    order: {
                        id: message?.order?.id || "",
                        state: message?.order?.state || orderDetails?.ondc_context?.message?.order?.state,
                        provider: message?.order?.provider,
                        quote: message?.order?.quote || orderDetails?.ondc_context?.message?.order?.quote

                    }
                }
            }
            // OnUpdateRequest.message.order["items"]
            if (message?.order?.items) {
                message.order.items= (message?.order?.items).map((item) => {
                    if (item?.tags?.update_type == "cancel") {
                       item.tags = { status: "Cancelled" }
                    }
                    if (item?.tags?.update_type == "return") {
                        item.tags = { status: "Liquidated" }
                    }
                    return item
                })

           let prev_order_items = orderDetails?.ondc_context?.message?.order?.items
            let new_order_items = [];
                for(let i=0;i<prev_order_items.length;i++){
                if(!prev_order_items[i]?.tags && prev_order_items[i]?.tags?.status!="Cancelled" && prev_order_items[i]?.tags?.status!="Return_Approved"){
                (message?.order?.items).forEach(async request_item => {
                    if (request_item?.id == prev_order_items[i]?.id) {
                        if (request_item?.tags?.status == 'Cancelled' || request_item?.tags?.status == 'Return_Approved'||request_item?.tags?.status == 'Liquidated') {
                            const new_order_item = JSON.parse(JSON.stringify( prev_order_items[i]));
                            prev_order_items[i]["quantity"]["count"] = parseInt(prev_order_items[i]?.quantity?.count) - parseInt(request_item?.quantity?.count);
                            if (prev_order_items[i]["quantity"]["count"] == 0) {
                                prev_order_items[i]["quantity"]["count"] = request_item?.quantity?.count
                                prev_order_items[i]["tags"] = request_item?.tags ;
                            } else {
                                new_order_item["quantity"]["count"] = request_item?.quantity?.count;
                                new_order_item["tags"] = request_item?.tags ;
                                new_order_items.push(new_order_item)
                            }
                        }
                    }
                })
            }
        }
            
            OnUpdateRequest.message.order["items"] = (prev_order_items).concat(new_order_items)
        };
            // console.log(JSON.stringify(OnUpdateRequest));

            if (OnUpdateRequest.message.order.quote && message?.order?.items) {
                let quote = await this.calculateQuote(OnUpdateRequest.message.order.quote, message?.order?.items)
                OnUpdateRequest.message.order.quote = quote;
            }

            if (JSON.stringify(requestContext) === '{}') {
                var data = {
                    "meta_data": {
                        "access_template_id": 1,
                        "token_user_id": 1,
                        "company_id": 1,
                        "request_id": String(uuidv4()),
                        "encryption": false,
                        "additional_fields": {
                            "type": "partial_cancel"
                        }

                    },
                    "data": OnUpdateRequest
                }
                produceKafkaEvent(kafkaClusters.Tech, topics.SALES_ORDER_CANCEL, data).catch(console.error)
            } else if (requestContext?.type == "bpp_partial_cancel") {
                var data = {
                    "meta_data": {
                        "access_template_id": 1,
                        "token_user_id": 1,
                        "company_id": 1,
                        "request_id": String(uuidv4()),
                        "encryption": false,
                        "additional_fields": {
                            "type": "partial_cancel"
                        }

                    },
                    "data": {
                        "transaction_id": context?.transaction_id,
                        "quote": OnUpdateRequest?.message?.order?.quote
                    }
                }
                produceKafkaEvent(kafkaClusters.Tech, topics.SALES_ORDER_STATUS_UPDATE, data).catch(console.error)
            }
            // console.log(JSON.stringify(OnUpdateRequest));
            await this.UpdateDetailsInBppOrders(OnUpdateRequest);
            await bppProtocolOnUpdate(uri, OnUpdateRequest);
        }
        catch (err) {
            throw err;
        }
    }

    async calculateQuote(quote, items) {
        // console.log("quote--->calculateQuote", JSON.stringify(quote));
        // console.log("items--->calculateQuote", JSON.stringify(items));

        var quote_break_up = quote?.breakup;
        let new_quote_break_up = [];
        let partial_cancel_items = [];
        let cancel_items = []

        for (let i = 0; i < items.length; i++) {
            quote_break_up.map(brk_up_item => {
                if (brk_up_item['@ondc/org/item_id'] == items[i]["id"] && brk_up_item?.['@ondc/org/title_type'] == 'item' && brk_up_item?.['@ondc/org/item_quantity']?.count != items?.[i]?.quantity?.count) {
                    partial_cancel_items.push(brk_up_item['@ondc/org/item_id'])
                }
                if (!cancel_items.includes(items[i]['id'])) {
                    cancel_items.push(items[i]['id'])
                }
            })
        }

        for (let i = 0; i < items.length; i++) {
            quote_break_up.map(brk_up_item => {
                if (cancel_items.includes(brk_up_item['@ondc/org/item_id'])) {
                    if (partial_cancel_items.includes(brk_up_item['@ondc/org/item_id'])) {
                        if (brk_up_item?.['@ondc/org/title_type'] == 'item' && brk_up_item?.['@ondc/org/item_quantity']?.count != items?.[i]?.quantity?.count) {
                            brk_up_item['@ondc/org/item_quantity']['count'] = parseFloat(brk_up_item['@ondc/org/item_quantity']?.['count']) - parseFloat(items?.[i]?.quantity?.count)
                            brk_up_item['price']['value'] = parseFloat(brk_up_item?.item?.price?.value) * parseFloat(brk_up_item['@ondc/org/item_quantity']['count'])
                        }
                        if (!new_quote_break_up.includes(brk_up_item)) {
                            new_quote_break_up.push(brk_up_item)
                        }
                    }
                }
                else {
                    new_quote_break_up.push(brk_up_item)

                }
            })
        }
        let total_price = 0
        new_quote_break_up.forEach(item => {
            total_price = (parseFloat(total_price) + parseFloat(item?.price?.value)).toString();
        });

        let break_up = {
            price: {
                "currency": "INR",
                "value": total_price.toString() || "0"
            },
            breakup: new_quote_break_up
        };


        return break_up


    }


    async ONDCUpdateEvent({ uri, orderRequest }) {
        try {

            const response = await protocolUpdate(uri, orderRequest);

            return response;
        }
        catch (err) {
            throw err;
        }
    }

    async UpdateDetailsInBppOrders(response){
        
        let query = {
            transaction_id : response?.context?.transaction_id
        }

        let orderDetails = await GetBppOrder(query)

        if (orderDetails == null) {
            return
        }

        if (response?.message?.order?.items != null){

        let new_order_items = [];
            for(let i=0;i<orderDetails?.items.length;i++){
            if(!orderDetails?.items[i]?.tags && orderDetails?.items[i]?.tags?.status!="Cancelled" && orderDetails?.items[i]?.tags?.status!="Return_Approved"){
            (response?.message?.order?.items).forEach(async request_item => {
                if (request_item?.id == orderDetails?.items[i]?.id) {
                    if (request_item?.tags?.status == 'Cancelled' || request_item?.tags?.status == 'Return_Approved') {
                        const new_order_item = JSON.parse(JSON.stringify( orderDetails?.items[i]));
                        orderDetails.items[i]["quantity"]["count"] = parseInt(orderDetails?.items[i]?.quantity?.count) - parseInt(request_item?.quantity?.count);
                        if (orderDetails?.items[i]["quantity"]["count"] == 0) {
                            orderDetails.items[i]["quantity"]["count"] = request_item?.quantity?.count
                            orderDetails.items[i]["tags"] = request_item?.tags ;
                        } else {
                            new_order_item["quantity"]["count"] = request_item?.quantity?.count;
                            new_order_item["tags"] = request_item?.tags ;
                            new_order_items.push(new_order_item)
                        }
                    }
                }
            })
        }
        };
        orderDetails.items = (orderDetails?.items).concat(new_order_items)
        }
        
        if (orderDetails?.state != 'Delivered' && response?.message?.order?.state == "Delivered"){
            orderDetails.delivered_at = new Date()
        }
        else if (orderDetails?.state != 'Cancelled' && response?.message?.order?.state == "Cancelled"){
            orderDetails.cancelled_at = new Date()  
            orderDetails.cancelled_by = "Seller"
            cancellation_reason.every(cancel_reason => {
                if(response?.message?.order?.tags?.cancellation_reason_id == cancel_reason?.code){
                    orderDetails.cancellation_reason = response?.message?.order?.tags?.cancellation_reason_id||cancel_reason?.code;
                    orderDetails.cancellation_remark = cancel_reason?.reason;
                    return false;
                }
                return true;
            });
        } else if (orderDetails?.state != 'Shipped' && response?.message?.order?.state == "Shipped"){
            orderDetails.shipped_at = new Date()  
        }
        orderDetails.quote = response?.message?.order?.quote
        orderDetails.state = response?.message?.order?.state
        //TODO store/update in db
        UpdateBppOrder(query, orderDetails)
    }

}

export default BppUpdateService;
