import ContextFactory from "../../shared/factories/ContextFactory.js";
import BppSearchService from "./bppSearch.service.js";
import { PROTOCOL_CONTEXT } from "../../shared/utils/constants.js";
import {
  searchProductbyName,
  getProviderById,
  searchProduct,
  getAllProviders,
} from "../../shared/db/dbService.js";
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

// import logger from "../lib/logger";
const bppSearchService = new BppSearchService();

class SearchService {
  /**
   * search
   * @param {Object} searchRequest
   */
  async bppOnSearchResults(uri, req, api, providers_meta_data) {
    try {
      await bppSearchService.bppOnSearchResults(
        uri,
        req.body.context,
        req.body.message,
        providers_meta_data
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * @param {Object} searchRequest
   */
  async bppProductMetaCheck(location) {
    try {
      let searchLat = location.split(",")[0];
      let searchLong = location.split(",")[1];

      let providers = await getAllProviders();

      let providersServiceable = [];

      for (let i = 0; i < providers.length; i++) {
        // let flag = false;
        var locations = providers[i]?.locations;
        var tags = providers[i]?.tags;
        var serviceableLocations = [];
        let tag_array = []
        if (tags) {
          tags.forEach(tag => {
            if (tag.code == "serviceability") {
              let tag_list = {}
              for (let i = 0; i < tag.list.length; i++) {
                tag_list[tag.list[i].code] = tag.list[i].value
              }
              tag_array.push(tag_list)
            };
          })
        }
        if (locations) {
          locations.forEach((location) => {
            for (let j = 0; j < tag_array.length; j++) {
              if (tag_array[j]['location'] == location.id || tag_array[j]['location'] == '*') {
                if (tag_array[j].type == "12") {
                  // flag = true;
                  delete location?.circle;
                  let obj = serviceableLocations.find(Location => Location.id === location.id);
                  if (!obj) { serviceableLocations.push(location); }
                } else if (tag_array[j].type == "10") {
                  if (location.gps) {
                    let providerLat = (location.gps).split(",")[0];
                    let providerLong = (location.gps).split(",")[1];
                    let d = this.calcCrow(
                      { lat: parseFloat(providerLat), lng: parseFloat(providerLong) },
                      { lat: parseFloat(searchLat), lng: parseFloat(searchLong) }
                    );
                    if (d <= tag_array[j].val) {
                      delete location?.circle;
                      let obj = serviceableLocations.find(Location => Location.id === location.id);
                      if (!obj) { serviceableLocations.push(location); }
                      // flag = true;
                    }
                  }
                }
              }
            }
          });
        }
        // console.log("serviceableLocations", JSON.stringify(serviceableLocations));
        if (serviceableLocations.length > 0) {
          delete providers[i]?.locations;
          delete providers[i]?.company_id;
          delete providers[i]?.ttl;
          providers[i]["locations"] = serviceableLocations;
          providers[i]["fulfillments"][0]["contact"] ={
            "phone": providers[i]?.company_details?.phone || "9876543210",
            "email": providers[i]?.company_details?.email || "contact@eunimart.com"
          }; 
          delete providers[i]?.company_details;
          providersServiceable.push(providers[i])
        }
      }
      return providersServiceable;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  calcCrow(coords1, coords2) {
    var R = 6371; //km 
    var dLat = this.toRad(coords2.lat - coords1.lat);
    var dLon = this.toRad(coords2.lng - coords1.lng);
    var lat1 = this.toRad(coords1.lat);
    var lat2 = this.toRad(coords2.lat);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    return d;
  }

  toRad(Value) {
    return (Value * Math.PI) / 180;
  }

  /**
   * search
   * @param {Object} searchRequest
   */
  async bppOnSearch(searchRequest = {}) {
    try {
      // logger.info(`[SearchService][search] Search product`, {params: searchRequest});

      const { context: requestContext = {}, message = {} } = searchRequest;
      const { criteria = {}, payment } = message;

      const contextFactory = new ContextFactory();
      const protocolContext = contextFactory.create({
        transactionId: requestContext?.transaction_id,
        bppId: requestContext?.bpp_id,
        bppUrl: requestContext?.bpp_uri,
        city: requestContext.city,
        state: requestContext.state,
        cityCode: requestContext.cityCode,
        action: PROTOCOL_CONTEXT.ON_SEARCH,
      });

      return await bppSearchService.bppOnSearch(protocolContext, {
        criteria,
        payment,
      });
    } catch (err) {
      throw err;
    }
  }
}

export default SearchService;
