import mongoose from "mongoose";

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

const ProductCategorySchema = new mongoose.Schema({
    id: { type: String },
    created_by: { type: String },
    update_date: {type:String},
    updated_by:{type:String},
    created_date:{type:String},
    name:{type:String},
    parent_category_id:{type:String},
    external_id:{type:String},
    related_category_ids:{type:String},
    additives_information:{type:String},
    short_description:{type:String},
    domain_id:{type:String},
    category_code:{type:String},

   }  ,
   { _id: true, timestamps: true }
);

ProductCategorySchema.index({userId: 1, createdAt: -1});


const ProductCategory = mongoose.model('product_category', ProductCategorySchema, "product_category");

export default ProductCategory;
