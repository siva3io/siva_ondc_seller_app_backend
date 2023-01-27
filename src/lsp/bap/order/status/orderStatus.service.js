import { onOrderStatus } from "../../../../shared/utils/protocolApis/index.js";
import { PROTOCOL_CONTEXT } from "../../../../shared/utils/constants.js";
import {addOrUpdateOrderWithTransactionId, getOrderById} from "../../../../shared/db/dbService.js";
import OrderMongooseModel from '../../../../shared/db/order.js';

import ContextFactory from "../../../../shared/factories/ContextFactory.js";
import BppOrderStatusService from "./bppOrderStatus.service.js";
import LSPValidator from "../../../../shared/utils/validations/lsp_validations/validations.js"

import { v4 as uuidv4} from 'uuid';

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

const bppOrderStatusService = new BppOrderStatusService();
var lspValidator = new LSPValidator();

class OrderStatusService {

//============================================ LSP =================================================================


    async ONDCLspOrderStatusEvent(orderRequest) {
        try {

            const { context: requestContext = {}, message = {} } = orderRequest;

            //Validation
            var validation_flag = await lspValidator.validateStatus(orderRequest)

            if (!validation_flag) {
                return {
                        context : orderRequest.context,
                        message: {
                            "ack": { "status": "NACK" },
                            "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
                        }
                    }
            }

            return await bppOrderStatusService.getONDCLspOrderStatus(
                requestContext.bpp_uri,
                orderRequest
            );
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }
    /**
    * status order
    * @param {Object} order
    */
     async ONDCOrderStatus(orderRequest) {
        try {

            const { context: requestContext = {}, message = {} } = orderRequest;

            //Validation
            var validation_flag = await lspValidator.validateStatus(orderRequest)

            if (!validation_flag) {
                return {
                        context : orderRequest.context,
                        message: {
                            "ack": { "status": "NACK" },
                            "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
                        }
                    }
            }

            return await bppOrderStatusService.getONDCOrderStatus(
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

export default OrderStatusService;
