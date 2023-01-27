import BppCancelService from "./bppCancel.service.js";
import LSPValidator from "../../../../shared/utils/validations/lsp_validations/validations.js";

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
var lspValidator = new LSPValidator();

class CancelOrderService {

    async ONDCCancelLspOrderEvent(orderRequest) {
        try {


            const { context: requestContext = {}, message: order = {} } = orderRequest || {};

            //Validation
            // var validation_flag = await lspValidator.validateCancel(orderRequest)

            // if (!validation_flag) {
            //     return {
            //             context : orderRequest.context,
            //             message: {
            //                 "ack": { "status": "NACK" },
            //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
            //             }
            //         }
            // }

            return await bppCancelService.ONDCCancelLspOrder(requestContext.bpp_uri, requestContext,orderRequest);
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

    /**
    * cancel order
    * @param {Object} orderRequest
    */
     async ONDCCancelOrder(orderRequest) {
        try {

            // const orderDetails = await getOrderById(orderRequest.message.order_id);

            const { context: requestContext = {}, message: order = {} } = orderRequest || {};

            //Validation
            // var validation_flag = await lspValidator.validateCancel(orderRequest)

            // if (!validation_flag) {
            //     return {
            //             context : orderRequest.context,
            //             message: {
            //                 "ack": { "status": "NACK" },
            //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
            //             }
            //         }
            // }

            return await bppCancelService.ONDCCancelOrder(
                requestContext.bpp_uri,
                requestContext,
                orderRequest
            );
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

}

export default CancelOrderService;
