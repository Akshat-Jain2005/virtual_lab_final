/**
 * redis/lockManager.js - Distributed locking for physics objects and room state
 */

const { getRedisClient } = require('./client');
const logger = require('../utils/logger');

/**
 * Acquire a distributed lock
 * @param {string} roomId 
 * @param {string} objectId 
 * @param {string} userId 
 * @param {number} ttl - Time to live in ms
 */
async function acquireLock(roomId, objectId, userId, ttl = 5000) {
  const client = getRedisClient();
  const lockKey = `lock:${roomId}:${objectId}`;
  
  // NX = Only set if doesn't exist, PX = milliseconds
  const result = await client.set(lockKey, userId, 'NX', 'PX', ttl);
  
  if (result === 'OK') {
    logger.debug(`Lock acquired: ${lockKey} by ${userId}`);
    return true;
  }
  
  return false;
}

/**
 * Release a lock if owned by the user
 */
async function releaseLock(roomId, objectId, userId) {
  const client = getRedisClient();
  const lockKey = `lock:${roomId}:${objectId}`;
  
  // Lua script for atomic release
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  
  const result = await client.eval(script, 1, lockKey, userId);
  return result === 1;
}

/**
 * Check if an object is locked
 */
async function getLockOwner(roomId, objectId) {
  const client = getRedisClient();
  const lockKey = `lock:${roomId}:${objectId}`;
  return await client.get(lockKey);
}

module.exports = {
  acquireLock,
  releaseLock,
  getLockOwner
};
