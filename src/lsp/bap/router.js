import { Router } from 'express';

import orderRoutes from "./order/order.routes.js";
// import supportRoutes from "./support/support.routes.js";
// import trackRoutes from "./fulfillment/track.routes.js";
import sseRoutes from "./sse/sse.routes.js";
import lspClientRoutes from "./lsp_bap_client/router.js";
import searchRoutes from "./discovery/search.routes.js";

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

const router = new Router();

router.use(orderRoutes);
// router.use(supportRoutes);
// router.use(trackRoutes);
router.use(sseRoutes);
router.use(lspClientRoutes);
router.use(searchRoutes);

export default router;