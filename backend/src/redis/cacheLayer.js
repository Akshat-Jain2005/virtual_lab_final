/**
 * redis/cacheLayer.js - Typed helpers for room, user, and analytics streams
 */

const { getRedisClient } = require('./client');

const TTL = {
  ROOM_STATE: 3600,
  USER_SESSION: 86400,
  PRESENCE: 60, // 1 minute
};

/**
 * Cache room state
 */
async function cacheRoomState(roomId, state) {
  const client = getRedisClient();
  const key = `cache:room:${roomId}`;
  await client.set(key, JSON.stringify(state), 'EX', TTL.ROOM_STATE);
}

/**
 * Presence: Add user to room
 */
async function setUserPresence(roomId, userId) {
  const client = getRedisClient();
  const key = `presence:room:${roomId}`;
  await client.sadd(key, userId);
  await client.expire(key, TTL.PRESENCE);
}

/**
 * Get active users in room
 */
async function getPresence(roomId) {
  const client = getRedisClient();
  const key = `presence:room:${roomId}`;
  return await client.smembers(key);
}

/**
 * Analytics Stream: Add frame
 * Uses Redis Streams (XADD) with MAXLEN to prevent memory overflow
 */
async function addAnalyticsFrame(roomId, frame) {
  const client = getRedisClient();
  const key = `stream:analytics:${roomId}`;
  const payload = typeof frame === 'string' ? frame : JSON.stringify(frame);
  
  // XADD key MAXLEN ~1000 * field value
  await client.xadd(key, 'MAXLEN', '~', 1000, '*', 'data', payload);
}

/**
 * Cache user session
 */
async function cacheUserSession(userId, sessionData) {
  const client = getRedisClient();
  const key = `cache:user:${userId}`;
  await client.set(key, JSON.stringify(sessionData), 'EX', TTL.USER_SESSION);
}

module.exports = {
  cacheRoomState,
  setUserPresence,
  getPresence,
  addAnalyticsFrame,
  cacheUserSession
};
