/**
 * utils/AuditLogWriter.js - Batch audit log writer to MongoDB
 */

const AuditLog = require("../models/AuditLog");
const config = require("../config");
const logger = require("./logger");
const metrics = require("./metrics");

class AuditLogWriter {
  constructor() {
    this.queue = [];
    this.flushTimer = null;
    this.isConnected = false;
  }

  /**
   * Queue an audit log entry
   */
  log(entry) {
    const auditEntry = {
      timestamp: new Date(),
      ...entry,
    };

    this.queue.push(auditEntry);

    // Flush if queue is full
    if (this.queue.length >= config.audit.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      // Schedule flush if not already scheduled
      this.flushTimer = setTimeout(
        () => this.flush(),
        config.audit.flushIntervalMs,
      );
    }
  }

  /**
   * Flush queued entries to MongoDB
   */
  async flush() {
    if (this.queue.length === 0) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      return;
    }

    const entriesToWrite = [...this.queue];
    this.queue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      const startTime = performance.now();

      await AuditLog.insertMany(entriesToWrite);

      const latency = performance.now() - startTime;
      metrics.recordAuditLogWriteLatency(latency);

      logger.debug(`Flushed ${entriesToWrite.length} audit log entries`, {
        latency: `${latency.toFixed(2)}ms`,
      });
    } catch (err) {
      logger.error("Failed to flush audit logs:", err);
      // Re-queue on failure (with size limit to prevent memory leak)
      if (this.queue.length < config.audit.batchSize * 2) {
        this.queue.unshift(...entriesToWrite);
      }
    }
  }

  /**
   * Start background flush timer
   */
  start() {
    if (!config.audit.enabled) {
      return;
    }

    this.isConnected = true;
    this.flushTimer = setInterval(() => {
      this.flush();
    }, config.audit.flushIntervalMs);

    logger.info("AuditLogWriter started");
  }

  /**
   * Stop and flush all pending entries
   */
  async stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
    this.isConnected = false;
    logger.info("AuditLogWriter stopped");
  }
}

module.exports = new AuditLogWriter();
