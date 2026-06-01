
module.exports = {
  
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/virtual-lab',
  
  
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  
  jwtSecret: process.env.SECRET_KEY || 'your-secret-key',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  
  
  physics: {
    timestep: 1 / 60, 
    gravity: 9.81,
    maxSubsteps: 5,
  },
  
  
  workerPool: {
    maxWorkers: process.env.MAX_WORKERS || require('os').cpus().length,
    healthCheckInterval: 5000,
  },
  
  
  socketIo: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  },
  
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
  },
  
  
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    port: process.env.METRICS_PORT || 9090,
    path: '/metrics',
  },
  
  
  security: {
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
    sequenceIdTimeout: 300000, 
  },
  
  
  audit: {
    enabled: process.env.AUDIT_ENABLED !== 'false',
    batchSize: 1000,
    flushIntervalMs: 5000,
    ttlDays: 90,
  },
};
