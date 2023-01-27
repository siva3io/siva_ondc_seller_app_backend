import { PROTOCOL_CONTEXT } from "../../../../../shared/utils/constants.js";
import BppCancelService from "./bppCancel.service.js";
import ContextFactory from "../../../../../shared/factories/ContextFactory.js";
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
const bppCancelService = new BppCancelService();

class CancelOrderService {

    /**
    * cancel order
    * @param {Object} orderRequest
    */
     async cancelLspOrder(orderRequest) {
        try {
            const { context: requestContext = {}, message: message = {} } = orderRequest || {};

            const contextFactory = new ContextFactory();
            const context = contextFactory.create({
                domain:process.env.LSP_DOMAIN,
                country: requestContext?.country,
                city: requestContext?.city,
                state : requestContext?.state,
                action: PROTOCOL_CONTEXT?.CANCEL,
                bap_id: requestContext.bap_id ? requestContext?.bap_id : process.env.LSP_BAP_ID,
                bap_uri:requestContext.bap_uri ? requestContext?.bap_uri :process.env.LSP_BAP_URL,
                bppId: requestContext.bpp_id,
                bppUrl: requestContext.bpp_uri,
                transactionId : requestContext.transaction_id,
                ttl: requestContext.ttl ? requestContext.ttl : null,
            });

            const { order_id, cancellation_reason_id } = message || {};


            return await bppCancelService.cancelLspOrder(
                context,
                order_id,
                cancellation_reason_id
            );
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
}

export default CancelOrderService;
