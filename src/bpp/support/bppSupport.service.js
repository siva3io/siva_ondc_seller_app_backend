import { PROTOCOL_CONTEXT } from "../../shared/utils/constants.js";
import { bppProtocolOnSupport, protocolSupport } from "../../shared/utils/protocolApis/index.js";
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
class BppSupportService {
    
    /**
    * bpp on support order
    * @param {Object} context
    * @param {Object} order
    * @param {String} parentOrderId
    */
     async bppOnSupportResponse(uri, context, order = {}, parentOrderId) {
        try {

          context.action = PROTOCOL_CONTEXT.ON_SUPPORT

            const supportRequest = {
              context: context,
              message:  {
                "phone": "+919886098860",
                "email": "test@ondc.org",
                "uri": "chatbot_uri"
              }
            
           
            }
            await bppProtocolOnSupport(uri, supportRequest);
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppSupportService;
