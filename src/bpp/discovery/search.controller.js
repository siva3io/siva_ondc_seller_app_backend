import SearchService from './search.service.js';
import NoRecordFoundError from "../../shared/lib/errors/no-record-found.error.js";
import { PROTOCOL_CONTEXT, SUBSCRIBER_TYPE } from '../../shared/utils/constants.js';
import messages from '../../shared/utils/messages.js';
import { searchProductbyName } from "../../shared/db/dbService.js";
import { getSubscriberType } from "../../shared/utils/registryApis/registryUtil.js";
import CustomLogs from '../../shared/utils/customLogs.js';
import { isSignatureValid } from '../../shared/utils/cryptic.js';
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

const searchService = new SearchService();

class SearchController {

    /**
    * search
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
    async bppSearch(req, res, next) {
        var proxy_auth = ""

        if(req.body.context.bpp_id == process.env.BPP_ID) {
            proxy_auth = req.headers["authorization"]?.toString() || "";
        } else {
            proxy_auth = req.headers["x-gateway-authorization"]?.toString() || "";
        }

        const root = this

        CustomLogs.writeRetailLogsToONDC(JSON.stringify(req.body), PROTOCOL_CONTEXT.SEARCH,getSubscriberType(SUBSCRIBER_TYPE.BPP))

        isSignatureValid(proxy_auth, req.body, SUBSCRIBER_TYPE.BG).then(async (isValid) => {
            if(!isValid) {
                return res.status(401)
                .setHeader('Proxy-Authenticate', proxy_auth)
                .json({ message : { 
                        "ack": { "status": "NACK" },  
                        "error": { "type": "Gateway", "code": "10001", "message": "Invalid Signature" } } 
                    })
            } else {
                var location = req?.body?.message?.intent?.fulfillment?.end?.location?.gps
                var providers_meta_data = await searchService.bppProductMetaCheck(location);

                if (providers_meta_data.length < 1 ){
                
                    return res.status(401)
                    .setHeader('Proxy-Authenticate', proxy_auth)
                    .json({ message : { 
                            "ack": { "status": "NACK" },  
                            "error": { "type": "Gateway", "code": "10001", "message": "Invalid Signature" } } 
                        }) 
                }
               
                res.status(200).send(messages.getAckResponse(req.body.context));
                
                const end_point = proxy_auth ? process.env.PROTOCOL_BASE_URL : req.body.context.bap_uri;
                
                searchService.bppOnSearchResults(end_point, req, "search", providers_meta_data);
                
            }
        })
    }

    /**
    * search
    * @param {*} req    HTTP request object
    * @param {*} res    HTTP response object
    * @param {*} next   Callback argument to the middleware function
    * @return {callback}
    */
     bppOnSearch(req, res, next) {
        const searchRequest = req.body;

        searchService.bppOnSearch(searchRequest).then(response => {
            if(!response || response === null)
                throw new NoRecordFoundError("No result found");
            else
                res.json(response);
        }).catch((err) => {
            next(err);
        });
    }
}

export default SearchController;
