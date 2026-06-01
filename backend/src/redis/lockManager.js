
const { getRedisClient } = require('./client');
const logger = require('../utils/logger');

async function acquireLock(roomId, objectId, userId, ttl = 5000) {
  const client = getRedisClient();
  const lockKey = `lock:${roomId}:${objectId}`;
  
  
  const result = await client.set(lockKey, userId, 'NX', 'PX', ttl);
  
  if (result === 'OK') {
    logger.debug(`Lock acquired: ${lockKey} by ${userId}`);
    return true;
  }
  
  return false;
}

async function releaseLock(roomId, objectId, userId) {
  const client = getRedisClient();
  const lockKey = `lock:${roomId}:${objectId}`;
  
  
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
