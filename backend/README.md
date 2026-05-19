# Virtual Lab — Backend

Enterprise-grade distributed physics engine and real-time collaboration platform built on Node.js, Socket.io, MongoDB, and Redis.

---

## Quick Start

```bash
npm install
npm run dev
```

Server runs at [http://localhost:5000](http://localhost:5000) (or the port set in `.env`).

---

## ⚠️ MongoDB Not Running? (macOS)

If the server fails to connect to MongoDB on startup, install and start it with Homebrew:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Verify it is running:

```bash
brew services list | grep mongodb
```

You should see `mongodb-community started`. MongoDB will be available at `mongodb://localhost:27017`.

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/virtual-lab

# Redis
REDIS_URL=redis://localhost:6379

# Auth
SECRET_KEY=your_jwt_secret_here
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:5173

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
LOG_LEVEL=info

# Workers
MAX_WORKERS=4

# Audit
AUDIT_ENABLED=true
```

---

## Features

### ⚙️ Multi-Threaded Physics Worker Pool

`src/workers/WorkerPool.js` · `src/workers/PhysicsWorker.js`

- Spawns one Node.js worker thread per CPU core (configurable via `MAX_WORKERS`).
- Each room is assigned to a worker; the pool queues incoming rooms when all workers are busy.
- Workers run a **60 Hz fixed-timestep** Matter.js simulation loop (`src/physics/engine/FixedLoop.js`) so physics ticks are decoupled from the main event loop.
- The pool tracks worker health, assigned room counts, and performance stats; dead workers are replaced automatically.
- `workerPool.setIo(io)` wires the pool directly to Socket.io so physics deltas are broadcast to room members as they arrive from worker threads.

### 🔄 Client-Side Prediction & Rollback

`src/physics/engine/Rollback.js` · `src/workers/RollbackWorker.js` · `src/utils/SequenceTracker.js`

- Every socket event carries a `seqId` that is validated against a per-user sequence tracker to detect and reject replayed or out-of-order packets.
- The `Rollback` engine stores world snapshots at regular intervals; when a client reports a mismatch the server rewinds to the last valid snapshot and re-simulates forward.
- `RollbackWorker` runs as a Bull job, processing rollback tasks off the main thread.

### 🌐 Real-Time Room Engine

`src/sockets/RoomManager.js` · `src/sockets/handlers/index.js`

Key socket events handled:

| Event | Description |
|---|---|
| `room:create` | Creates a room, spawns a physics worker, logs to audit trail |
| `room:join` | Validates membership, joins the Socket.io room, broadcasts peer list |
| `room:leave` | Removes peer, cleans up if room is empty |
| `physics:grab` | Acquires a Redis lock on a body so only one user can move it |
| `physics:release` | Releases the body lock |
| `cursor:move` | Broadcasts cursor position to all peers in the room |
| `simulation:play/pause/reset` | Controls the physics worker's fixed loop |
| `experiment:save` | Serializes and persists the world snapshot |

### 📡 Redis Layer

`src/redis/`

| Module | Purpose |
|---|---|
| `client.js` | Shared `ioredis` connection |
| `cacheLayer.js` | TTL-based key-value cache for room state and user sessions |
| `lockManager.js` | Distributed locks for body ownership (prevents two users grabbing the same body) |
| `pubsub.js` | Pub/sub channels used by `@socket.io/redis-adapter` for horizontal scaling |

### 📊 Analytics Pipeline

`src/analytics/` · `src/workers/AnalyticsWorker.js`

- **`AnalyticsPipeline.js`** — Processes incoming physics frames, computes KE/PE per body, and forwards results to the frontend analytics panel.
- **`EMAProcessor.js`** — Applies Exponential Moving Average smoothing to noisy velocity streams before they reach the charts.
- **`KalmanFilter.js`** — Kalman filter for high-frequency sensor data; reduces jitter on force readouts.
- `AnalyticsWorker` runs as a Bull job so heavy data processing never blocks physics ticks.
- `AnalyticsFrame` MongoDB model stores historical frame data for the full-page analytics route (`/room/:id/analytics`).

### 🧲 Physics Plugins

`src/physics/plugins/`

| Plugin | Description |
|---|---|
| `FluidDragPlugin.js` | Applies velocity-dependent drag to simulate fluid resistance |
| `SpringDegradationPlugin.js` | Reduces spring stiffness over time to model fatigue |
| `ViscosityPlugin.js` | Adds viscosity coefficient to constraint damping |

### 🗃 Data Models (MongoDB / Mongoose)

`src/models/`

| Model | Description |
|---|---|
| `User.js` | Auth credentials, role, profile |
| `Project.js` | Saved experiment metadata |
| `SimulationRoom.js` | Room settings, owner, lock state |
| `CollaborationSession.js` | Session membership, join/leave timestamps |
| `PhysicsObject.js` | Persisted body properties |
| `Constraint.js` | Rope, spring, pivot, motor definitions |
| `EnvironmentPreset.js` | Gravity, fluid, and environment settings |
| `ExperimentTemplate.js` | Full world snapshot for library templates |
| `AnalyticsFrame.js` | Per-tick KE/PE/body data for historical charts |
| `AuditLog.js` | Immutable log of every state-mutating action |

### 🔐 Auth & Security

`src/auth/` · `src/api/middlewares/index.js`

- JWT-based authentication (`jsonwebtoken`), passwords hashed with `bcryptjs`.
- Role system: **owner**, **editor**, **viewer** enforced per socket event via `requireRole()`.
- `validateRoomMembership()` middleware blocks events from users not in the room.
- Sequence ID anti-replay: every mutating event is rejected if its `seqId` has been seen before or arrives out of order.
- Rate limiting (100 req / 60 s window), CORS, and `joi` request validation applied at the Express layer.
- Audit log (`AuditLogWriter`) batches and flushes records to MongoDB every 5 seconds; TTL of 90 days.

### 📈 Observability

`src/utils/metrics.js` · `backend/monitoring/`

- `prom-client` exposes a `/metrics` endpoint (default port `9090`) with counters and histograms for active rooms, physics tick latency, WebSocket connections, and queue depths.
- `backend/monitoring/prometheus.yml` — Prometheus scrape config.
- `backend/monitoring/grafana-dashboards/main.json` — Pre-built Grafana dashboard.
- `backend/monitoring/grafana-datasources.yml` — Grafana datasource pointing at the Prometheus instance.
- Structured JSON logging via `src/utils/logger.js` (pretty-printed in dev, JSON in production).

### 🐳 Docker Deployment

`backend/docker/`

```bash
cd backend/docker
docker-compose up -d
```

The compose file starts:

- **`virtual-lab-app`** — Node.js server on port `3000` (mapped from internal `5000`), metrics on `9090`.
- **`virtual-lab-mongodb`** — MongoDB 6.0 with a named data volume.
- **`virtual-lab-redis`** — Redis 7 Alpine.
- **Nginx** — Reverse proxy (`nginx.conf`) terminating TLS and routing `/api` and `/socket.io` traffic.

---

## REST API

Base URL: `http://localhost:5000/api`

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/users/register` | Create account |
| `POST` | `/users/login` | Login, receive JWT |
| `GET` | `/users/me` | Get current user profile |

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/projects` | List all projects for the current user |
| `POST` | `/projects` | Create a new experiment |
| `GET` | `/projects/:id` | Get experiment details |
| `PUT` | `/projects/:id` | Update experiment |
| `DELETE` | `/projects/:id` | Delete experiment |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics/:roomId` | Get historical analytics frames for a room |
| `POST` | `/analytics/frame` | Ingest a new analytics frame |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (used by Docker) |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint |

---

## Project Structure

```
backend/
├── server.js                        # Entry point — Express + Socket.io + DB init
├── src/
│   ├── analytics/
│   │   ├── AnalyticsPipeline.js     # Frame processing and KE/PE computation
│   │   ├── EMAProcessor.js          # Exponential moving average smoother
│   │   └── KalmanFilter.js          # Kalman filter for noisy sensor streams
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── userController.js
│   │   │   ├── projectController.js
│   │   │   └── analyticsController.js
│   │   ├── middlewares/
│   │   │   └── index.js             # Auth, rate-limit, role, joi validation
│   │   └── routes/
│   │       ├── userRoutes.js
│   │       ├── projectRoutes.js
│   │       └── analyticsRoutes.js
│   ├── auth/
│   │   ├── jwtService.js            # Sign / verify tokens
│   │   └── permissions.js           # Role definitions and checks
│   ├── config/
│   │   ├── index.js                 # Centralized config (env vars + defaults)
│   │   └── physics.js               # Physics constants
│   ├── events/
│   │   └── index.js                 # Internal event bus
│   ├── models/                      # Mongoose schemas (see table above)
│   ├── physics/
│   │   ├── engine/
│   │   │   ├── PhysicsEngine.js     # Matter.js engine wrapper
│   │   │   ├── FixedLoop.js         # 60 Hz deterministic tick loop
│   │   │   └── Rollback.js          # Snapshot + rewind logic
│   │   └── plugins/
│   │       ├── FluidDragPlugin.js
│   │       ├── SpringDegradationPlugin.js
│   │       └── ViscosityPlugin.js
│   ├── protobuf/
│   │   ├── schema.proto             # Protobuf schema for binary physics deltas
│   │   └── serializer.js            # Encode / decode physics frames
│   ├── queues/
│   │   └── index.js                 # Bull queue definitions (analytics, rollback)
│   ├── redis/
│   │   ├── client.js                # ioredis connection
│   │   ├── cacheLayer.js            # TTL cache helpers
│   │   ├── lockManager.js           # Distributed body locks
│   │   └── pubsub.js                # Pub/sub for socket adapter
│   ├── sockets/
│   │   ├── RoomManager.js           # In-memory room state
│   │   └── handlers/
│   │       └── index.js             # All socket event handlers
│   ├── types/
│   │   └── index.js                 # Shared type constants
│   ├── utils/
│   │   ├── AuditLogWriter.js        # Batched audit log flusher
│   │   ├── SequenceTracker.js       # Per-user seqId anti-replay tracker
│   │   ├── logger.js                # Structured JSON logger
│   │   └── metrics.js               # prom-client counters and histograms
│   └── workers/
│       ├── PhysicsWorker.js         # Worker thread — runs Matter.js at 60 Hz
│       ├── AnalyticsWorker.js       # Bull worker — processes analytics frames
│       ├── RollbackWorker.js        # Bull worker — handles rollback jobs
│       └── WorkerPool.js            # Thread pool manager (CPU-core sized)
├── tests/
│   └── unit/
│       ├── EMAProcessor.test.js
│       ├── KalmanFilter.test.js
│       ├── Rollback.test.js
│       └── serializer.test.js
└── docker/
    ├── Dockerfile
    ├── docker-compose.yml
    └── nginx.conf
```

---

## Available Scripts

```bash
npm run dev    # Start with nodemon (auto-restart on changes)
npm start      # Start without nodemon (production)
npm test       # Run Jest unit tests
```

---

## Tech Stack

| Category | Library |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 5 |
| Database | MongoDB 6 via Mongoose |
| Real-Time | Socket.io 4, @socket.io/redis-adapter |
| Cache & Queues | Redis 7, ioredis, Bull |
| Physics | Matter.js (worker threads) |
| Auth | jsonwebtoken, bcryptjs |
| Validation | Joi |
| Monitoring | prom-client, Prometheus, Grafana |
| Serialization | Protocol Buffers (protobufjs) |
| Logging | Custom JSON logger |
| Testing | Jest |
