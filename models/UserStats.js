const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  
  userId: String,
  spotId: Number,
  grindingSpotName: String, 
  items: Object, 
  total: Number,
  totalDiscounted: {
    type: Number,
    required: true,
},
  average: Number,
  hours: Number,
  minutes: Number,
  
}, { timestamps: true });

module.exports = mongoose.model('UserStats', userStatsSchema);
