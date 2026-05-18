/**
 * utils/SequenceTracker.js - Sequence ID anti-replay system
 */

const config = require("../config");
const metrics = require("./metrics");
const logger = require("./logger");

/**
 * Simple in-memory sequence tracker
 * In production, use Redis for distributed tracking
 */
class SequenceTracker {
  constructor() {
    // Map<userId, { lastSeq: number, timestamp: number }>
    this.userSequences = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Validate and update sequence ID
   * @returns {boolean} true if sequence is valid, false if replay
   */
  validateAndUpdate(userId, sequenceId) {
    const now = Date.now();

    // Initialize user if not exists
    if (!this.userSequences.has(userId)) {
      this.userSequences.set(userId, { lastSeq: 0, timestamp: now });
      return true;
    }

    const record = this.userSequences.get(userId);

    // Check for replay (sequence ID not increasing)
    if (sequenceId <= record.lastSeq) {
      metrics.recordSequenceReplayAttempt(true);
      logger.warn(`[SECURITY] Sequence replay detected for user ${userId}`, {
        expectedMin: record.lastSeq + 1,
        received: sequenceId,
      });
      return false;
    }

    // Update last sequence
    record.lastSeq = sequenceId;
    record.timestamp = now;

    return true;
  }

  /**
   * Clean up old sequences to prevent memory leak
   */
  cleanup() {
    const now = Date.now();
    const timeout = config.security.sequenceIdTimeout;

    for (const [userId, record] of this.userSequences) {
      if (now - record.timestamp > timeout) {
        this.userSequences.delete(userId);
      }
    }
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      trackedUsers: this.userSequences.size,
    };
  }

  /**
   * Shutdown
   */
  shutdown() {
    clearInterval(this.cleanupInterval);
  }
}

module.exports = new SequenceTracker();
