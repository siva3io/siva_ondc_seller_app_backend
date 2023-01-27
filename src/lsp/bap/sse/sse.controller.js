import BadRequestParameterError from '../../../shared/lib/errors/bad-request-parameter.error.js';
import { addSSEConnection } from '../../../shared/utils/sse.js';
import { redisClient } from "../../../shared/database/redis.js";
import SseProtocol from './sseProtocol.service.js';
import ConfigureSse from "./configureSse.service.js";
import CustomLogs from '../../../shared/utils/customLogs.js';
import { PROTOCOL_CONTEXT, SUBSCRIBER_TYPE } from '../../../shared/utils/constants.js';
import { getSubscriberType } from '../../../shared/utils/registryApis/registryUtil.js';

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


const sseProtocolService = new SseProtocol();

class SseController {

    /**
    * on event 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async onEvent(req, res, next) {

        try {
            const { query = {} } = req;
            const { messageId, action } = query;

            if (messageId && messageId.length) {

                var time = 2000
                if (action == 'on_search'){
                    time = 10000
                }
                else{
                    time = 5000
                }
                
                const configureSse = new ConfigureSse(req, res, messageId, time);
                const initSSE = configureSse.initialize();
                
                addSSEConnection(messageId, initSSE);

            }

        }
        catch (err) {
            console.log("error----------->",err);
            throw err;
        }
    }

    /**
    * on cancel 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onCancel(req, res, next) {
        const { body: response } = req;

        CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_CANCEL, getSubscriberType(SUBSCRIBER_TYPE.BAP))

        const messageId = response?.context?.message_id;
        const bbpId = response.context?.bpp_id;
            
        if (typeof messageId === 'undefined' || bbpId === 'undefined'){
            return res.status(400).json({
                message: {
                    ack: {
                        status: "NACK"
                    }
                }
            });
        }

        sseProtocolService.onCancel(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on confirm 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async onConfirm(req, res, next) {
        const { body: response } = req;

        CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_CONFIRM, getSubscriberType(SUBSCRIBER_TYPE.BAP))

        const messageId = response?.context?.message_id;
        const bbpId = response.context?.bpp_id;
            
        if (typeof messageId === 'undefined' || bbpId === 'undefined'){
            return res.status(400).json({
                message: {
                    ack: {
                        status: "NACK"
                    }
                }
            });
        }

        await redisClient.set("lsp.on_confirm."+messageId, JSON.stringify(response));

        sseProtocolService.onConfirm(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });     
    }

    /**
    * on init 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async onInit(req, res, next) {
        const { body: response } = req;

        CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_INIT, getSubscriberType(SUBSCRIBER_TYPE.BAP))

        const messageId = response?.context?.message_id;
        const bbpId = response.context?.bpp_id;
            
        if (typeof messageId === 'undefined' || bbpId === 'undefined'){
            return res.status(400).json({
                message: {
                    ack: {
                        status: "NACK"
                    }
                }
            });
        }

        await redisClient.set("lsp.on_init."+messageId, JSON.stringify(response));

        sseProtocolService.onInit(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on search 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */

    async onSearch(req, res, next) {
        try {
            const { body: response } = req;

            CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_SEARCH, getSubscriberType(SUBSCRIBER_TYPE.BAP))

            let messageId = response?.context?.message_id;
            let bbpId = response.context?.bpp_id;
                
            if (typeof messageId === 'undefined' || bbpId === 'undefined'){
                return res.status(400).json({
                    message: {
                        ack: {
                            status: "NACK"
                        }
                    }
                });
            }


            await redisClient.lPush("lsp.on_search."+messageId, JSON.stringify(response))

            let result = await sseProtocolService.onSearch(response)
            res.json(result)
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            next(err);
        }  
    }

    /**
    * on status 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onStatus(req, res, next) {
        const { body: response } = req;

        CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_STATUS, getSubscriberType(SUBSCRIBER_TYPE.BAP))

        const messageId = response?.context?.message_id;
        const bbpId = response.context?.bpp_id;
            
        if (typeof messageId === 'undefined' || bbpId === 'undefined'){
            return res.status(400).json({
                message: {
                    ack: {
                        status: "NACK"
                    }
                }
            });
        }

        sseProtocolService.onStatus(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on support 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onSupport(req, res, next) {
        const { body: response } = req;

        CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_SUPPORT, getSubscriberType(SUBSCRIBER_TYPE.BAP))

        const messageId = response?.context?.message_id;
        const bbpId = response.context?.bpp_id;
            
        if (typeof messageId === 'undefined' || bbpId === 'undefined'){
            return res.status(400).json({
                message: {
                    ack: {
                        status: "NACK"
                    }
                }
            });
        }

        sseProtocolService.onSupport(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    /**
    * on track 
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    onTrack(req, res, next) {
        const { body: response } = req;

        CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_TRACK, getSubscriberType(SUBSCRIBER_TYPE.BAP))

        const messageId = response?.context?.message_id;
        const bbpId = response.context?.bpp_id;
            
        if (typeof messageId === 'undefined' || bbpId === 'undefined'){
            return res.status(400).json({
                message: {
                    ack: {
                        status: "NACK"
                    }
                }
            });
        }

        sseProtocolService.onTrack(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }

    onUpdate(req, res, next) {
        const { body: response } = req;

        const messageId = response?.context?.message_id;
        const bbpId = response.context?.bpp_id;

        CustomLogs.writeLSPLogsToONDC(JSON.stringify(response), PROTOCOL_CONTEXT.ON_UPDATE, getSubscriberType(SUBSCRIBER_TYPE.BAP))
            
        if (typeof messageId === 'undefined' || bbpId === 'undefined'){
            return res.status(400).json({
                message: {
                    ack: {
                        status: "NACK"
                    }
                }
            });
        }

        sseProtocolService.onUpdate(response).then(result => {
            res.json(result);
        }).catch((err) => {
            next(err);
        });
    }
}

export default SseController;
