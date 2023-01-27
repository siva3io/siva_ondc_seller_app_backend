import BppSupportService from "./bppSupport.service.js";
import LSPValidator from "../../../shared/utils/validations/lsp_validations/validations.js";

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

const bppSupportService = new BppSupportService();
var lspValidator = new LSPValidator();

class SupportService {
  
  async ONDCSupportLspOrderEvent(orderRequest, isMultiSellerRequest = false) {
    try {
      const { context: requestContext = {}, message: refObj = {} } = orderRequest || {};

        // //Validation
        // var validation_flag = await lspValidator.validateSupport(orderRequest)

        // if (!validation_flag) {
        //     return {
        //             context : orderRequest.context,
        //             message: {
        //                 "ack": { "status": "NACK" },
        //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
        //             }
        //         }
        // }

      const bppResponse = await bppSupportService.ONDCLspSupport(
        requestContext.bpp_uri,
        orderRequest
      );

      return bppResponse;
    } catch (err) {
      throw err;
    }
  }
  /**
   * support order
   * @param {Object} orderRequest
   * @param {Boolean} isMultiSellerRequest
   */
   async ONDCSupportOrder(orderRequest, isMultiSellerRequest = false) {
    try {
      const { context: requestContext = {}, message: refObj = {} } = orderRequest || {};

      // //Validation
        // var validation_flag = await lspValidator.validateSupport(orderRequest)

        // if (!validation_flag) {
        //     return {
        //             context : orderRequest.context,
        //             message: {
        //                 "ack": { "status": "NACK" },
        //                 "error": { "type": "Gateway", "code": "10000", "message": "Bad or Invalid request error" }
        //             }
        //         }
        // }

      const bppResponse = await bppSupportService.ONDCSupport(
        requestContext.bpp_uri,
        orderRequest
      );

      return bppResponse;
    } catch (err) {
      throw err;
    }
  }
}

export default SupportService;
