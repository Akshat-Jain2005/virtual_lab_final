/**
 * config/index.js - Centralized configuration
 */

module.exports = {
  // Server
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/virtual-lab',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.SECRET_KEY || 'your-secret-key',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  
  // Physics
  physics: {
    timestep: 1 / 60, // 60 Hz
    gravity: 9.81,
    maxSubsteps: 5,
  },
  
  // Worker Pool
  workerPool: {
    maxWorkers: process.env.MAX_WORKERS || require('os').cpus().length,
    healthCheckInterval: 5000,
  },
  
  // Socket.io
  socketIo: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
  },
  
  // Metrics
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    port: process.env.METRICS_PORT || 9090,
    path: '/metrics',
  },
  
  // Security
  security: {
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
    sequenceIdTimeout: 300000, // 5 minutes
  },
  
  // Audit
  audit: {
    enabled: process.env.AUDIT_ENABLED !== 'false',
    batchSize: 1000,
    flushIntervalMs: 5000,
    ttlDays: 90,
  },
};
