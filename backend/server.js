require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const config = require("./src/config");
const logger = require("./src/utils/logger");
const metrics = require("./src/utils/metrics");
const { authMiddleware, rateLimitMiddleware } = require("./src/api/middlewares");
const { initializeHandlers } = require("./src/sockets/handlers");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const { getInstance: getWorkerPool } = require("./src/workers/WorkerPool");
const auditLogWriter = require("./src/utils/AuditLogWriter");

const userRoutes = require("./src/api/routes/userRoutes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, config.socketIo);

// ── Redis Adapter (optional — falls back to in-memory if Redis is down) ──────
const { createAdapter } = require("@socket.io/redis-adapter");
const pubClient = new Redis(config.redisUrl, { lazyConnect: true });
const subClient = pubClient.duplicate();

pubClient.on("error", (err) => logger.warn("[Redis] pub error:", err.message));
subClient.on("error", (err) => logger.warn("[Redis] sub error:", err.message));

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("[Redis] Adapter attached successfully");
  })
  .catch((err) => {
    logger.warn("[Redis] Adapter skipped, using in-memory fallback:", err.message);
  });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/projects", require("./src/api/routes/projectRoutes"));
app.use("/api/analytics", require("./src/api/routes/analyticsRoutes"));

app.get("/", (req, res) => {
  res.send("Backend API + WebSocket + Physics Engine Running");
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(await metrics.getMetrics());
});

app.get("/api/admin/active-users", async (req, res) => {
  try {
    const sockets = await io.fetchSockets();
    const userIds = [...new Set(sockets.map(s => s.userId).filter(Boolean))];
    
    // Add demo user handling specifically for our fallback demo tokens
    const dbUserIds = userIds.filter(id => !id.startsWith('usr_demo'));
    
    const User = require("./src/models/User");
    const activeUsers = await User.find({ _id: { $in: dbUserIds } }, "username email role");
    
    // If demo users exist, manually append a mock user object for them
    if (userIds.some(id => id.startsWith('usr_demo'))) {
      activeUsers.push({
        _id: 'usr_demo001',
        username: 'Demo User (Anonymous)',
        email: 'demo@virtual-lab.local',
        role: 'instructor'
      });
    }

    res.json({ 
      activeConnections: sockets.length,
      uniqueUsers: activeUsers.length,
      users: activeUsers 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => {
  const workerPool = getWorkerPool();
  const poolMetrics = workerPool.getMetrics();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    workers: { active: poolMetrics.activeWorkers, total: poolMetrics.maxWorkers },
    rooms: { active: poolMetrics.activeRooms, queued: poolMetrics.queuedRooms },
  });
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.use(authMiddleware);
io.use(rateLimitMiddleware());

initializeHandlers(io);
getWorkerPool().setIo(io);

io.on("connection", (socket) => {
  metrics.updateWebsocketConnections(io.engine.clientsCount);
  socket.on("disconnect", () => {
    metrics.updateWebsocketConnections(io.engine.clientsCount);
  });
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown...`);

  io.disconnectSockets();

  const workerPool = getWorkerPool();
  await workerPool.shutdown();

  await auditLogWriter.stop();
  await mongoose.connection.close();

  server.close(() => {
    logger.info("Server shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
  // Don't shutdown for Redis connection failures — they are non-fatal
  if (reason?.message?.includes("Stream isn't writeable") ||
      reason?.message?.includes("ECONNREFUSED")) return;
  gracefulShutdown("unhandledRejection");
});

// ── Start Server ──────────────────────────────────────────────────────────────
async function startServer() {
  try {
    // Attempt MongoDB connection in background to prevent startup crash if database is temporarily down
    mongoose.connect(config.mongoUri)
      .then(() => {
        logger.info("Connected to MongoDB");
        auditLogWriter.start();
      })
      .catch((err) => {
        logger.error(`[MongoDB] Initial connection failed: ${err.message}. Reconnecting in background...`);
        const retryConnection = () => {
          setTimeout(async () => {
            logger.info("[MongoDB] Retrying MongoDB connection...");
            try {
              await mongoose.connect(config.mongoUri);
              logger.info("Connected to MongoDB successfully");
              auditLogWriter.start();
            } catch (retryErr) {
              logger.error(`[MongoDB] Reconnection failed: ${retryErr.message}. Retrying again in 5s...`);
              retryConnection();
            }
          }, 5000);
        };
        retryConnection();
      });

    // Redis metrics client (optional — errors are silently ignored)
    const metricsRedis = new Redis(config.redisUrl, { lazyConnect: true });
    metricsRedis.on("error", () => {}); // suppress noise
    metricsRedis.connect().catch(() => {});

    setInterval(async () => {
      try {
        const info = await metricsRedis.info("memory");
        const usedMemory = info.match(/used_memory:(\d+)/);
        if (usedMemory) metrics.updateRedisMemoryUsage(parseInt(usedMemory[1], 10));

        const roomManager = require("./src/sockets/handlers").getRoomManager();
        const roomMetrics = roomManager.getMetrics();
        metrics.updateRoomMetrics(roomMetrics.totalRooms, roomMetrics.totalUsers);
      } catch {
        // Redis not available — skip metrics update silently
      }
    }, 15000);

    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        environment: config.nodeEnv,
        workers: config.workerPool.maxWorkers,
      });
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
