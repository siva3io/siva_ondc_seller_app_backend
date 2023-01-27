import BppUpdateService from "./bppUpdate.service.js";
import LSPValidator from "../../../../shared/utils/validations/lsp_validations/validations.js";
import {UpsertLspOrder} from '../../../../shared/db/lsp_dbService.js';

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

const bppUpdateService = new BppUpdateService();
var lspValidator = new LSPValidator();

class UpdateOrderService {

    /**
    * update order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
     async ONDCLspUpdateOrderEvent(orderRequest, isMultiSellerRequest = false) {
        try {
            const { context: requestContext = {}, message = {} } = orderRequest;
            
            //Validation
            // var validation_flag = await lspValidator.validateUpdate(orderRequest)

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
            }
            var filterQuery = {
                'context.transaction_id': requestContext?.transaction_id,
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            const bppResponse = await bppUpdateService.ONDCLspUpdate(
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
    * update order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
     async ONDCUpdateOrder(orderRequest, isMultiSellerRequest = false) {
        try {
            const { context: requestContext = {}, message = {} } = orderRequest;
            //Validation
            // var validation_flag = await lspValidator.validateUpdate(orderRequest)

            // if (!validation_flag) {
            //     return {
            //             context : orderRequest.context,
            //             message: {
            //                 "ack": { "status": "NACK" },
            //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
            //             }
            //         }
            // }

            const bppResponse = await bppUpdateService.ONDCUpdate(
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

}

export default UpdateOrderService;
