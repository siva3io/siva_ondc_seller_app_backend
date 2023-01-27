import BppConfirmService from "./bppConfirm.service.js";
import LSPValidator from "../../../../shared/utils/validations/lsp_validations/validations.js"
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

const bppConfirmService = new BppConfirmService();
var lspValidator = new LSPValidator();

class ConfirmOrderService {

    async ONDCLspConfirmOrderEvent(orderRequest) {
        try {
            const { context: context = {}, message = {} } = orderRequest;
            
            //Validation
            // var validation_flag = await lspValidator.validateConfirm(orderRequest)

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
                context : context,
                ...orderDetails,
            }
            var filterQuery = {
                'context.transaction_id': context?.transaction_id,
            }
            await UpsertLspOrder(filterQuery, lspOrderPayload)

            return await bppConfirmService.ONDCLspConfirm(
                context.bpp_uri,
                orderRequest
            );
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
    * confirm order
    * @param {Object} orderRequest
    */
     async ONDCConfirmOrder(orderRequest) {
        try {
            const { context: requestContext = {}, message = {} } = orderRequest;

            //Validation
            // var validation_flag = await lspValidator.validateConfirm(orderRequest)

            // if (!validation_flag) {
            //     return {
            //             context : orderRequest.context,
            //             message: {
            //                 "ack": { "status": "NACK" },
            //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
            //             }
            //         }
            // }

            return await bppConfirmService.ONDCConfirm(
                requestContext.bpp_uri,
                orderRequest
            );
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }



}

export default ConfirmOrderService;
