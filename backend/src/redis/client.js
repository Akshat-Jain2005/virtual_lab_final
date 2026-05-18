/**
 * redis/client.js - Redis client singleton with retry and health management
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../config');

let redisInstance = null;

/**
 * Get Redis client instance
 */
function getRedisClient() {
  if (!redisInstance) {
    redisInstance = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    redisInstance.on('connect', () => {
      logger.info('Redis connected');
    });

    redisInstance.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisInstance.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }
  return redisInstance;
}

/**
 * Health check for Redis
 */
async function checkHealth() {
  if (!redisInstance) return false;
  try {
    const result = await redisInstance.ping();
    return result === 'PONG';
  } catch (err) {
    return false;
  }
}

module.exports = {
  getRedisClient,
  checkHealth
};
