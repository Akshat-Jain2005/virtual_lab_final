
const config = require("../config");

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_LEVEL = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, data) {
  const logEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    ...(data && { data }),
    env: config.nodeEnv,
  };

  if (config.logging.prettyPrint) {
    return `[${logEntry.timestamp}] [${level.toUpperCase()}] ${message} ${data ? JSON.stringify(data, null, 2) : ""}`;
  }

  return JSON.stringify(logEntry);
}

const logger = {
  debug(message, data) {
    if (LOG_LEVEL <= LOG_LEVELS.debug) {
      console.log(formatMessage("debug", message, data));
    }
  },

  info(message, data) {
    if (LOG_LEVEL <= LOG_LEVELS.info) {
      console.log(formatMessage("info", message, data));
    }
  },

  warn(message, data) {
    if (LOG_LEVEL <= LOG_LEVELS.warn) {
      console.warn(formatMessage("warn", message, data));
    }
  },

  error(message, error) {
    if (LOG_LEVEL <= LOG_LEVELS.error) {
      const data =
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error;

      console.error(formatMessage("error", message, data));
    }
  },
};

module.exports = logger;
