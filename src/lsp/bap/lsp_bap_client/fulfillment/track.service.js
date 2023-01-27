import { PROTOCOL_CONTEXT } from "../../../../shared/utils/constants.js";
import BppTrackService from "./bppTrack.service.js";
import ContextFactory from "../../../../shared/factories/ContextFactory.js";
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
const bppTrackService = new BppTrackService();

class TrackService {

//======================================== LSP =============================================================
    /**
    * track order
    * @param {Object} orderRequest
    * @param {Boolean} isMultiSellerRequest
    */
     async trackLspOrder(orderRequest, isMultiSellerRequest = false) {
        try {
            const { context: requestContext = {}, message: order = {} } = orderRequest || {};

            const contextFactory = new ContextFactory();
            const context = contextFactory.create({
                domain:process.env.LSP_DOMAIN,
                country: requestContext?.country,
                city: requestContext?.city,
                state : requestContext?.state,
                action: PROTOCOL_CONTEXT?.TRACK,
                bap_id: requestContext.bap_id ? requestContext?.bap_id : process.env.LSP_BAP_ID,
                bap_uri:requestContext.bap_uri ? requestContext?.bap_uri :process.env.LSP_BAP_URL,
                bppId: requestContext.bpp_id,
                bppUrl: requestContext.bpp_uri,
                transactionId : requestContext.transaction_id,
                ttl: requestContext.ttl ? requestContext.ttl : null,
                });

            const bppResponse = await bppTrackService.trackLspOrder(context,order);

            return bppResponse;
        }
        catch (err) {
            console.log("Error =======>>> ",err);
            return err;
        }
    }

}

export default TrackService;
