import { Router } from 'express';
import SseController from './sse.controller.js';

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

const sseController = new SseController();
const rootRouter = new Router();

rootRouter.get('/lsp_bap/eunimart_lsp_bap/events', sseController.onEvent);


rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_search', sseController.onSearch);
rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_init', sseController.onInit);
rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_confirm', sseController.onConfirm);
rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_update', sseController.onUpdate);
rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_cancel', sseController.onCancel);
rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_status', sseController.onStatus);
rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_track', sseController.onTrack);
rootRouter.post('/lsp_bap/eunimart_lsp_bap/on_support', sseController.onSupport);

export default rootRouter;
