const mongoose = require('mongoose');

const physicsObjectSchema = new mongoose.Schema({
  originalId: String, // ID from Matter.js
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  type: { type: String, enum: ['rectangle', 'circle', 'polygon'], required: true },
  label: String,
  state: {
    position: { x: Number, y: Number },
    velocity: { x: Number, y: Number },
    angle: Number,
    angularVelocity: Number
  },
  physicsProperties: {
    mass: Number,
    restitution: Number,
    friction: Number,
    isStatic: { type: Boolean, default: false }
  },
  visuals: {
    color: String,
    dimensions: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = mongoose.model('PhysicsObject', physicsObjectSchema);
