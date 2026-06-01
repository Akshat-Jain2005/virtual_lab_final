
const EMAProcessor = require('./EMAProcessor');
const { getRedisClient } = require('../redis/client');
const { queueAnalyticsFlush } = require('../queues');

class AnalyticsPipeline {
  constructor() {
    this.ema = new EMAProcessor(0.15);
    this.batch = [];
    this.batchSize = 10;
  }

    processFrame(roomId, bodies) {
    const analyticsData = {
      roomId,
      timestamp: new Date(),
      bodies: bodies.map(b => this.ema.process(b.id, b)),
      aggregateData: {
        totalKE: 0,
        averageVelocity: 0
      }
    };

    
    const count = analyticsData.bodies.length || 1;
    analyticsData.aggregateData.totalKE = analyticsData.bodies.reduce((sum, b) => sum + b.smoothedKE, 0);
    analyticsData.aggregateData.totalPE = analyticsData.bodies.reduce((sum, b) => sum + (b.smoothedPE ?? 0), 0);
    analyticsData.aggregateData.averageVelocity = analyticsData.bodies.reduce((sum, b) => sum + b.smoothedVelocity, 0) / count;
    analyticsData.aggregateData.averageVx = analyticsData.bodies.reduce((sum, b) => sum + (b.vx ?? 0), 0) / count;
    analyticsData.aggregateData.averageVy = analyticsData.bodies.reduce((sum, b) => sum + (b.vy ?? 0), 0) / count;

    
    const client = getRedisClient();
    client.publish(`analytics:${roomId}`, JSON.stringify(analyticsData));

    
    this.batch.push(analyticsData);
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }

    return analyticsData;
  }

    flush() {
    if (this.batch.length === 0) return;
    
    queueAnalyticsFlush([...this.batch]);
    this.batch = [];
  }
}

module.exports = AnalyticsPipeline;
