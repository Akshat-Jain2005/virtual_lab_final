/**
 * models/AuditLog.js - MongoDB Audit Log Schema
 */

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "user:join",
        "user:leave",
        "grab",
        "release",
        "rollback",
        "settings:change",
        "auth:denied",
        "auth:expired",
        "room:create",
        "room:delete",
        "experiment:save",
      ],
    },
    roomId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "denied", "error"],
      default: "success",
    },
    reason: String, // For denied/error actions
    metadata: mongoose.Schema.Types.Mixed, // Flexible metadata storage
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "audit_logs" },
);

// TTL Index: auto-delete documents after 90 days
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ roomId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
