
const prometheus = require('prom-client');


prometheus.collectDefaultMetrics();



const websocketConnections = new prometheus.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

const physicsFrameTime = new prometheus.Histogram({
  name: 'physics_frame_time_ms',
  help: 'Physics simulation frame time in milliseconds',
  buckets: [5, 10, 16.667, 20, 30, 50, 100],
});

const physicsFramesDropped = new prometheus.Counter({
  name: 'physics_frames_dropped_total',
  help: 'Total number of physics frames dropped due to MAX_SUBSTEPS overflow',
});

const workerPoolUtilization = new prometheus.Gauge({
  name: 'worker_pool_utilization_percent',
  help: 'Worker pool utilization percentage',
});

const workerPoolActiveWorkers = new prometheus.Gauge({
  name: 'worker_pool_active_workers',
  help: 'Number of active workers in the pool',
});

const workerPoolQueuedRooms = new prometheus.Gauge({
  name: 'worker_pool_queued_rooms',
  help: 'Number of rooms waiting for worker assignment',
});

const auditLogWriteLatency = new prometheus.Histogram({
  name: 'audit_log_write_latency_ms',
  help: 'Audit log write latency in milliseconds',
  buckets: [1, 5, 10, 50, 100, 500],
});

const sequenceReplayAttempts = new prometheus.Counter({
  name: 'sequence_replay_attempts_total',
  help: 'Total number of sequence replay attack attempts detected',
  labelNames: ['result'],
});

const rbacDenials = new prometheus.Counter({
  name: 'rbac_denials_total',
  help: 'Total number of RBAC permission denials',
  labelNames: ['role', 'action'],
});

const roomsActive = new prometheus.Gauge({
  name: 'rooms_active',
  help: 'Number of active physics rooms',
});

const roomsUsersTotal = new prometheus.Gauge({
  name: 'rooms_users_total',
  help: 'Total number of users across all active rooms',
});

const redisMemoryUsage = new prometheus.Gauge({
  name: 'redis_memory_usage_bytes',
  help: 'Redis memory usage in bytes',
});



function updateWebsocketConnections(count) {
  websocketConnections.set(count);
}

function updatePhysicsFrameTime(ms) {
  physicsFrameTime.observe(ms);
}

function incrementFramesDropped(count = 1) {
  physicsFramesDropped.inc(count);
}

function updateWorkerPoolMetrics(metrics) {
  if (metrics.activeWorkers && metrics.maxWorkers) {
    const utilization = (metrics.activeWorkers / metrics.maxWorkers) * 100;
    workerPoolUtilization.set(utilization);
  }
  if (metrics.activeWorkers !== undefined) {
    workerPoolActiveWorkers.set(metrics.activeWorkers);
  }
  if (metrics.queuedRooms !== undefined) {
    workerPoolQueuedRooms.set(metrics.queuedRooms);
  }
}

function recordAuditLogWriteLatency(ms) {
  auditLogWriteLatency.observe(ms);
}

function recordSequenceReplayAttempt(detected = true) {
  sequenceReplayAttempts.inc({ result: detected ? 'detected' : 'allowed' });
}

function recordRbacDenial(role, action) {
  rbacDenials.inc({ role, action });
}

function updateRoomMetrics(activeRooms, totalUsers) {
  roomsActive.set(activeRooms);
  roomsUsersTotal.set(totalUsers);
}

function updateRedisMemoryUsage(bytes) {
  redisMemoryUsage.set(bytes);
}


function getMetrics() {
  return prometheus.register.metrics();
}

module.exports = {
  updateWebsocketConnections,
  updatePhysicsFrameTime,
  incrementFramesDropped,
  updateWorkerPoolMetrics,
  recordAuditLogWriteLatency,
  recordSequenceReplayAttempt,
  recordRbacDenial,
  updateRoomMetrics,
  updateRedisMemoryUsage,
  getMetrics,
};
