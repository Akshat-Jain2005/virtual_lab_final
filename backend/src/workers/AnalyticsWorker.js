
const { parentPort } = require('worker_threads');
const AnalyticsPipeline = require('../analytics/AnalyticsPipeline');

const pipeline = new AnalyticsPipeline();

parentPort.on('message', (msg) => {
  if (msg.type === 'physics:update') {
    const { roomId, bodies } = msg.data;
    
    
    const result = pipeline.processFrame(roomId, bodies);
    
    if (result) {
      
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
