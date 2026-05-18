/**
 * workers/AnalyticsWorker.js - Background thread for physics data processing
 */

const { parentPort } = require('worker_threads');
const AnalyticsPipeline = require('../analytics/AnalyticsPipeline');

const pipeline = new AnalyticsPipeline();

parentPort.on('message', (msg) => {
  if (msg.type === 'physics:update') {
    const { roomId, bodies } = msg.data;
    
    // Process analytics in background
    const result = pipeline.processFrame(roomId, bodies);
    
    if (result) {
      // Send back processed frames if needed by main thread
      parentPort.postMessage({
        type: 'analytics:frame',
        data: result
      });
    }
  }
  
  if (msg.type === 'shutdown') {
    process.exit(0);
  }
});

console.log('AnalyticsWorker initialized');
