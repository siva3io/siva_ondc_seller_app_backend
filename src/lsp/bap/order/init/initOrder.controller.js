import InitOrderService from './initOrder.service.js';
import BadRequestParameterError from '../../../../shared/lib/errors/bad-request-parameter.error.js';
import { isSignatureValid } from '../../../../shared/utils/cryptic.js';
import messages from '../../../../shared/utils/messages.js';
import {addOrUpdateOrderWithTransactionId, getOrderById, getOrderByTransactionId} from "../../../../shared/db/dbService.js";

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

const initOrderService = new InitOrderService();

class InitOrderController {
    /**
    * init order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
     ONDCInitOrder(req, res, next) {
        const { body: orderRequest } = req;

        initOrderService.ONDCInitOrder(orderRequest).then(response => {
            res.json(response);
        }).catch((err) => {
            console.log("Error =======>>> ",err);
            next(err);
        });
    }

    /**
    * init order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    msnInitAndConfirmOrder(req, res, next) {
        const orderRequest = req.body;

        initOrderService.msnInitAndConfirm(orderRequest).then(response => {
            res.json(response);
        }).catch((err) => {
            console.log("Error =======>>> ",err);
            next(err);
        });
    }
}

export default InitOrderController;
