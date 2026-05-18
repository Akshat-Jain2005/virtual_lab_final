const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  collaborators: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String
  }],
  versions: [{
    version: { type: Number, required: true },
    snapshot: mongoose.Schema.Types.Mixed,
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String
  }],
  currentVersion: { type: Number, default: 1 },
  autosaveAt: Date,
  settings: {
    isPublic: { type: Boolean, default: false },
    defaultPreset: { type: String, default: 'AIR' }
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

projectSchema.index({ ownerId: 1, createdAt: -1 });
module.exports = mongoose.model('Project', projectSchema);
