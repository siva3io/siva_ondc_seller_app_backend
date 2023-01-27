import {Router} from 'express';
import { authentication } from '../../../shared/middlewares/index.js';

import CancelOrderController from './cancel/cancelOrder.controller.js';
import ConfirmOrderController from './confirm/confirmOrder.controller.js';
import InitOrderController from './init/initOrder.controller.js';
import OrderHistoryController from './history/orderHistory.controller.js';
import UpdateOrderController from './update/updateOrder.controller.js';
import OrderStatusController from './status/orderStatus.controller.js';

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

const rootRouter = new Router();

const cancelOrderController = new CancelOrderController();
const confirmOrderController = new ConfirmOrderController();
const initOrderController = new InitOrderController();
const orderHistoryController = new OrderHistoryController();
const orderStatusController = new OrderStatusController();
const updateOrderController = new UpdateOrderController();

//==================== LSP ==============================================

// init order v1
rootRouter.post(
    '/lsp_bap/init',
    initOrderController.ONDCInitOrder
);

// confirm order v1
rootRouter.post(
    '/lsp_bap/confirm',
    confirmOrderController.ONDCConfirmOrder
);
// status order v1
rootRouter.post(
    '/lsp_bap/status',
    orderStatusController.ONDCStatusOrder
);

// cancel order v1
rootRouter.post(
    '/lsp_bap/cancel',
    cancelOrderController.ONDCCancelOrder
);

// update order v1
rootRouter.post(
    '/lsp_bap/update',
    updateOrderController.ONDCUpdateOrder
);

// update order v1
rootRouter.post(
    '/lsp_bap/msn_init_and_confirm',
    initOrderController.msnInitAndConfirmOrder
);


export default rootRouter;
