/**
 * models/CollaborationSession.js - MongoDB Collaboration Session Schema
 */

const mongoose = require("mongoose");

const collaborationSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    creatorId: {
      type: String,
      required: true,
      index: true,
    },
    name: String,
    description: String,
    startTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endTime: {
      type: Date,
      index: true,
    },
    duration: Number, // milliseconds
    users: [
      {
        userId: String,
        joinTime: Date,
        leaveTime: Date,
        role: String,
      },
    ],
    userCount: {
      type: Number,
      default: 0,
    },
    peakConcurrentUsers: {
      type: Number,
      default: 0,
    },
    eventCount: {
      type: Number,
      default: 0,
    },
    stats: {
      averageFrameTime: Number,
      droppedFrames: Number,
      physicsUpdates: Number,
      successRate: Number, // 0-100
    },
    settings: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["active", "completed", "error"],
      default: "active",
    },
  },
  { collection: "collaboration_sessions" },
);

// Indexes for common queries
collaborationSessionSchema.index({ creatorId: 1, startTime: -1 });
collaborationSessionSchema.index({ startTime: -1 });
collaborationSessionSchema.index({ endTime: -1 });

const CollaborationSession = mongoose.model(
  "CollaborationSession",
  collaborationSessionSchema,
);

module.exports = CollaborationSession;
