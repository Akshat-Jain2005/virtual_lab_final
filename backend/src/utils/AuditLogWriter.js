
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

    log(entry) {
    const auditEntry = {
      timestamp: new Date(),
      ...entry,
    };

    this.queue.push(auditEntry);

    
    if (this.queue.length >= config.audit.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      
      this.flushTimer = setTimeout(
        () => this.flush(),
        config.audit.flushIntervalMs,
      );
    }
  }

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
      
      if (this.queue.length < config.audit.batchSize * 2) {
        this.queue.unshift(...entriesToWrite);
      }
    }
  }

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
