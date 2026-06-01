
const { getRedisClient } = require('./client');
const logger = require('../utils/logger');

const CHANNELS = {
  PHYSICS_UPDATES: 'physics:updates',
  ANALYTICS_STREAM: 'analytics:stream',
  ROLLBACK_COMMANDS: 'rollback:commands',
  ROOM_EVENTS: 'room:events'
};

async function publish(channel, message) {
  const client = getRedisClient();
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  try {
    await client.publish(channel, payload);
  } catch (err) {
    logger.error(`Failed to publish to ${channel}:`, err);
  }
}

async function subscribe(channel, callback) {
  const client = getRedisClient().duplicate();
  
  await client.subscribe(channel);
  client.on('message', (chan, message) => {
    if (chan === channel) {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (err) {
        callback(message);
      }
    }
  });

  return client; 
}

module.exports = {
  CHANNELS,
  publish,
  subscribe
};
