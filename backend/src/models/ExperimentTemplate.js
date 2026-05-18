const mongoose = require('mongoose');

const experimentTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  objects: [mongoose.Schema.Types.Mixed],
  constraints: [mongoose.Schema.Types.Mixed],
  environment: {
    preset: { type: String, default: 'AIR' },
    customGravity: { x: Number, y: Number }
  },
  thumbnail: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ExperimentTemplate', experimentTemplateSchema);
