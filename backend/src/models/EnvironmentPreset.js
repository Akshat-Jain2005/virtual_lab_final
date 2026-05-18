const mongoose = require('mongoose');

const environmentPresetSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  label: String,
  config: {
    gravity: { x: Number, y: Number, scale: Number },
    frictionAir: Number,
    restitution: Number
  },
  visualEffects: {
    backgroundColor: String,
    particleType: String
  }
}, { timestamps: true });

module.exports = mongoose.model('EnvironmentPreset', environmentPresetSchema);
