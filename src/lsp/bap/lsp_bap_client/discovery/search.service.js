import _ from "lodash";
import ContextFactory from "../../../../shared/factories/ContextFactory.js";
import { PROTOCOL_CONTEXT} from "../../../../shared/utils/constants.js";
import BppSearchService from "./bppSearch.service.js";
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
const bppSearchService = new BppSearchService();

class SearchService {
    
    /**
    * search
    * @param {Object} searchRequest
    */

     async lspSearch(searchRequest = {}) {
        try {

            const { context: requestContext = {}, message = {} } = searchRequest;

            const contextFactory = new ContextFactory();
            const protocolContext = contextFactory.create({
                domain:process.env.LSP_DOMAIN,
                country: requestContext?.country,
                city: requestContext?.city,
                state : requestContext?.state,
                action: PROTOCOL_CONTEXT?.SEARCH,
                bap_id: requestContext.bap_id ? requestContext?.bap_id : process.env.LSP_BAP_ID,
                bap_uri:requestContext.bap_uri ? requestContext?.bap_uri :process.env.LSP_BAP_URL,
                ttl: requestContext.ttl ? requestContext.ttl : null,
            });

            return await bppSearchService.lspSearch(
                protocolContext,
                {message}
            );
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            throw err;
        }
    }
}

export default SearchService;
