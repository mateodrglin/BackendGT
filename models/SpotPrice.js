const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    itemName: String,
    price: Number
});

const SpotPriceSchema = new mongoose.Schema({
    spotNumber: Number,
    items: [ItemSchema]
});

const SpotPrice = mongoose.model('SpotPrice', SpotPriceSchema);

module.exports = SpotPrice;
