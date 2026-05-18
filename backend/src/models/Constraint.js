const mongoose = require('mongoose');

const constraintSchema = new mongoose.Schema({
  type: { type: String, enum: ['spring', 'joint', 'rod', 'rope'], required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  bodyAId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhysicsObject' },
  bodyBId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhysicsObject' },
  pointA: { x: Number, y: Number },
  pointB: { x: Number, y: Number },
  properties: {
    stiffness: Number,
    damping: Number,
    length: Number
  },
  degradation: {
    rate: { type: Number, default: 0 },
    currentStiffness: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Constraint', constraintSchema);
