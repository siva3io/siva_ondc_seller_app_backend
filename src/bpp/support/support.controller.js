import SupportService from './support.service.js';
import { isSignatureValid } from '../../shared/utils/cryptic.js';
import messages from '../../shared/utils/messages.js';
import { PROTOCOL_CONTEXT, SUBSCRIBER_TYPE } from '../../shared/utils/constants.js';
import CustomLogs from '../../shared/utils/customLogs.js';
import { getSubscriberType } from '../../shared/utils/registryApis/registryUtil.js';
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
const supportService = new SupportService();

class SupportController {
    
    /**
    * bpp support Order
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    bppSupportOrder(req, res, next) {
        var proxy_auth = ""

        if(req.body.context.bpp_id == process.env.BPP_ID) {
            proxy_auth = req.headers["authorization"]?.toString() || "";
        }
        CustomLogs.writeRetailLogsToONDC(JSON.stringify(req.body), PROTOCOL_CONTEXT.SUPPORT, getSubscriberType(SUBSCRIBER_TYPE.BPP))

        isSignatureValid(proxy_auth, req.body).then((isValid) => {
            if(!isValid) {
                return res.status(401)
                .json({ message : { 
                        "ack": { "status": "NACK" },  
                        "error": { "type": "BAP", "code": "10001", "message": "Invalid Signature" } } 
                    })
            } else {
                res.status(200).send(messages.getAckResponse(req.body.context));
                const end_point = req.body.context.bap_uri;
                supportService.bppOnSupportOrderResponse(end_point, req.body);
            }
        })
    }
}

export default SupportController;
