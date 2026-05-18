/**
 * queues/index.js - Job Queue management for background tasks
 */

const Queue = require('bull');
const logger = require('../utils/logger');
const config = require('../config');

// Initialize Bull queues
const queues = {
  autosave: new Queue('autosave', config.redisUrl),
  analyticsFlush: new Queue('analytics', config.redisUrl),
};

/**
 * Initialize queue processors
 */
function initializeQueues() {
  logger.info('Initializing job queues and processors...');
  
  // Autosave Processor
  queues.autosave.process(async (job) => {
    const { roomId, state } = job.data;
    logger.debug(`Autosaving room ${roomId} to DB...`);
    // Implementation: Update Project.versions with latest state
  });

  // Analytics Flush Processor
  queues.analyticsFlush.process(async (job) => {
    const { frames } = job.data;
    const AnalyticsFrame = require('../models/AnalyticsFrame');
    try {
      await AnalyticsFrame.insertMany(frames);
    } catch (err) {
      logger.error('Failed to flush analytics frames:', err);
    }
  });
}

/**
 * Add a job to the autosave queue
 */
async function queueAutosave(roomId, state) {
  return await queues.autosave.add({ roomId, state }, { 
    attempts: 3, 
    backoff: { type: 'exponential', delay: 5000 } 
  });
}

/**
 * Add frames to the flush queue
 */
async function queueAnalyticsFlush(frames) {
  return await queues.analyticsFlush.add({ frames }, { 
    removeOnComplete: true 
  });
}

module.exports = {
  initializeQueues,
  queueAutosave,
  queueAnalyticsFlush
};
