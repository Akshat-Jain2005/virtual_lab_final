const mongoose = require('mongoose');

const simulationRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'hibernated', 'closed'], default: 'active' },
  workerId: String,
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } } 
}, { timestamps: true });

module.exports = mongoose.model('SimulationRoom', simulationRoomSchema);
