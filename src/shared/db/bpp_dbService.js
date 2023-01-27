import BppOrderModel from './bpp_order.js';
// import BppBapUserCart from './bpp_bap_user_cart.js';


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

const CreateBppOrder = async (data) => {
    return await BppOrderModel.create(data);
};

const UpdateBppOrder = async (query, data) => {
    return await BppOrderModel.findOneAndUpdate(query, data);
};

const DeleteBppOrder = async (query) => {
    return await BppOrderModel.deleteOne(query);
};

const GetBppOrder = async (query) => {
    return await BppOrderModel.findOne(query).lean();
};
const ListBppOrder = async () => {
    console.log("service---------------")
    return await BppOrderModel.find().lean();
};

const UpsertBppOrder = async (query, data) => {
    return await BppOrderModel.findOneAndUpdate(query, data, {upsert: true});
}

//========================= user cart =================================================
const UpsertBppBapUserCartOrder = async (query, data) => {
    return await BppBapUserCart.findOneAndUpdate(query, data, {upsert: true});
}
const GetBppBapUserCartOrder = async (query) => {
    return await BppBapUserCart.findOne(query).lean();
};
const ListBppBapUserCartOrder = async (query) => {
    return await BppBapUserCart.find(query).lean();
};

export {
    CreateBppOrder,
    GetBppOrder,
    UpdateBppOrder,
    DeleteBppOrder,
    ListBppOrder,
    UpsertBppOrder,

    // UpsertBppBapUserCartOrder,
    // GetBppBapUserCartOrder,
    // ListBppBapUserCartOrder,
}