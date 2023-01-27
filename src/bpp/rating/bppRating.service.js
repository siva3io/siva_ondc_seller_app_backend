
import { bppProtocolOnRating, protocolRating, bppProtocolRatingCategories, protocolGetRatingCategories, protocolGetFeedbackCategories,bppProtocolFeedbackCategories,protocolGetFeedbackForm,bppProtocolFeedbackForm } from "../../shared/utils/protocolApis/index.js";
import { produceKafkaEvent } from '../../shared/eda/kafka.js'
import { topics } from '../../shared/eda/consumerInit/initConsumer.js'
import { redisSubscribe } from "../../shared/database/redis.js";
import axios from "axios";
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
class BppRatingService {
    
    /**
    * bpp on rating order
    * @param {Object} context
    * @param {Object} request
    */
     async bppOnRatingResponse(uri, context, request = {}) {
        try {
            let authorization = process.env.BPP_AUTH;

    
      let api_request = {
        baseURL: process.env.EUNIMART_CORE_HOST,
        url: "api/v1/rating/create_rating",
        method: "POST",
        headers: {
          Authorization: authorization,
        },
        data:request
      };
      let response = await axios(api_request)
      let feedback_ack=false
      let rating_ack=false
      if (response.status==200){
        feedback_ack=true
        rating_ack=true
      }
            const ratingRequest = {
              context: context,
              message:  {
                feedback_ack: feedback_ack,
                rating_ack: rating_ack
              }
            
           
            }
            await bppProtocolOnRating(uri, ratingRequest);
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * getratingcategories
     * @param {Object} context 
     * @param {String} refObj 
     * @returns 
     */
     async getBppRatingCategoriesService(uri, context = {}) {
        try {

            const getRatingCategoriesRequest = {
                context: context
            }
                        
            const response = await protocolGetRatingCategories(uri, getRatingCategoriesRequest);
            
            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }
    
    /**
     * getratingcategories
     * @param {Object} context 
     * @param {String} refObj 
     * @returns 
     */
     async getBppFeedbackCategoriesService(uri, context = {}) {
        try {

            const getFeedbackCategoriesRequest = {
                context: context
            }
                        
            const response = await protocolGetFeedbackCategories(uri, getFeedbackCategoriesRequest);
            
            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * getratingcategories
     * @param {Object} context 
     * @param {Object} message 
     * @returns 
     */
     async getBppFeedbackFormService(uri, context = {}, message = {}) {
        try {

            const getFeedbackFormRequest = {
                context: context,
                message: {
                    rating_value:message.rating_value,
                    rating_category:message.rating_category
                }
            }
                        
            const response = await protocolGetFeedbackForm(uri, getFeedbackFormRequest);
            
            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }
    
    

    /**
     * rating
     * @param {Object} context 
     * @param {Object} message 
     * @returns 
     */
    async BapRating(uri, context = {}, message) {
        try {
            const ratingRequest = {
                context: context,
                message: {
                    rating_category: message.rating_category,
                    id: message.id,
                    value: message.value,
                    feedback_form: message.feedback_form,
                    feedback_id: message.feedback_id
                }
            }
            let topic = process.env.KAFKA_TOPIC_PREFIX + '.' +topics.CLIENT_API_BAP_RATING

            await produceKafkaEvent(topic, ratingRequest)
           
            let response = await redisSubscribe(ratingRequest.context.message_id) 

            // const response = await protocolRating(uri, ratingRequest);
            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }
    

    /**
     * bpp get rating categories
     * @param {Object} context 
=     * @returns 
     */
     async BppRatingCategoriesService(uri, context = {}) {
        try {
            //call core list api of rating categories,arr=[]
            let authorization = process.env.BPP_AUTH;
             let api_request = {
            baseURL: process.env.EUNIMART_CORE_HOST,
            url: "api/v1/rating/rating_category_list",
             method: "GET",
            headers: {
            Authorization: authorization,
              }
            };
      let api_response = await axios(api_request)
      let data=[];
      data= api_response.data.data
      let response_data=[];
      for (let i = 0; i < data.length; i++) {
        response_data[i] = data[i]?.category_name;
        
      }
        const ratingCategoriesRequest = {
            context: context,
            rating_categories: response_data
            
        }
            const response = await bppProtocolRatingCategories(uri, ratingCategoriesRequest);
            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

        /**
     * bpp get feedback categories
     * @param {Object} context 
=     * @returns 
     */
async BppFeedbackCategoriesService(uri, context = {}) {
    try {
        //call core list api of feedback categories,arr=[]
        let authorization = process.env.BPP_AUTH;
        let api_request = {
        baseURL: process.env.EUNIMART_CORE_HOST,
        url: "/api/v1/rating/feedback_category_list",
        method: "GET",
        headers: {
          Authorization: authorization,
        }
    };
      let api_response = await axios(api_request)
      let data=[];
      data= api_response.data.data
      let response_data=[];
      for (let i = 0; i < data.length; i++) {
        response_data[i] = data[i]?.rating_category_name;
        
      }
        const feedbackCategoriesRequest = {
            context: context,
            feedback_categories: response_data
            
        }
        const response = await bppProtocolFeedbackCategories(uri, feedbackCategoriesRequest);
        return { context: context, message: response.message };
    }
    catch (err) {
        throw err;
    }
}

        /**
     * bpp get feedback form
     * @param {Object} context 
     * @param {Object} data 
=     * @returns 
     */
async BppFeedbackFormService(uri, context = {}, data = {}) {
    try {
        var rating_value=data?.rating_value
        var rating_category=data?.rating_category
        //give it as param in the get feedback from api and assign the value to 
        // api/v1/rating/feedback_form?rating_category_name=fulfillment&rating_value=5
        let authorization = process.env.BPP_AUTH;
             let api_request = {
            baseURL: process.env.EUNIMART_CORE_HOST,
            url: "api/v1/rating/list_feedback_form",
             method: "GET",
             params: {
                rating_category_name: rating_category,
                rating_value:rating_value,

              },
            headers: {
            Authorization: authorization,
              }
            };
            let api_response = await axios(api_request)
            let response_data={};
            response_data= api_response.data?.data
        const feedbackFormRequest = {
            context: context,
            message: {"feedback_form": response_data?.feedback_form,
              "feedback_url": response_data?.feeback_url
            }
        }
        if (response_data?.feedback_form==undefined){
            feedbackFormRequest.message={ "feedback_form": [ { "id": "sample_radio", "parent_id": "sample_parent", "question": "What is your sample feedback?", "answer": ["yes","no","maybe"], "answer_type": "radio" }, { "id": "sample_checkbox", "parent_id": "sample_parent", "question": "What is your sample feedback?", "answer": ["yes","no","maybe"], "answer_type": "checkbox" }, { "id": "sample_text", "parent_id": "sample_parent", "question": "What is your sample feedback?", "answer": "", "answer_type": "text" } ], "feedback_url": { "url": "sample url", "tl_method": "http/get", "params": { "feedback_id": "sample_id", "additionalProp1": "prop1", "additionalProp2": "prop2", "additionalProp3": "prop3" } } }
        }
        const response = await bppProtocolFeedbackForm(uri, feedbackFormRequest);
        return { context: context, message: response.message };
    }
    catch (err) {
        throw err;
    }
}

    

     /**
     * rating
     * @param {Object} context 
     * @param {String} refObj 
     * @returns 
     */
    async ONDCRating(uri, ratingRequest) {
        try {       

            let topic = process.env.KAFKA_TOPIC_PREFIX + '.' +topics.BAP_BPP_RATING

            await produceKafkaEvent(topic, {uri, ratingRequest})
           
            let response = await redisSubscribe(ratingRequest.context.message_id)
      
            // const response = await protocolRating(uri, ratingRequest);
            
            return { context: response.context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }

    async ONDCRatingEvent({uri, ratingRequest}) {
        try {       
            const response = await protocolRating(uri, ratingRequest);
            
            return response;
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppRatingService;
