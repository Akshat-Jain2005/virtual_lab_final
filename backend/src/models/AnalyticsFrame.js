const mongoose = require('mongoose');

const analyticsFrameSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  bodies: [{
    id: String,
    velocity: Number,
    kineticEnergy: Number,
    momentum: Number
  }],
  aggregateData: {
    totalKE: Number,
    averageVelocity: Number
  }
}, { timestamps: true });

analyticsFrameSchema.index({ roomId: 1, timestamp: -1 });
module.exports = mongoose.model('AnalyticsFrame', analyticsFrameSchema);
