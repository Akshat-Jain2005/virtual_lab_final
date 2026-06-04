<div align="center">

# ⚗️ Virtual Lab

### Collaborative 2D Physics Sandbox for University-Level Learning

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=flat-square&logo=socketdotio&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-AI--Powered-D97706?style=flat-square&logo=anthropic&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-22c55e?style=flat-square)

</div>

---

<div align="center">

| Service | URL |
|---|---|
| **Frontend** | https://frontend-rbag.onrender.com |
| **Backend API** | https://virtual-lab-backend-clg8.onrender.com |

> ⚠️ Both services are hosted on Render's free tier. The backend may take **~50 seconds** to wake up on the first request after a period of inactivity.

</div>

---

## 📖 Overview

Teaching complex physics and engineering concepts online is often limited to static videos and non-interactive text, failing to build intuition for dynamic physical systems. **Virtual Lab** addresses this by providing a **"Digital Twin"** environment — a collaborative 2D physics sandbox designed for university-level learning.

The platform allows multiple users to build machines, test structural integrity, and observe real-time forces in a shared, high-fidelity workspace, effectively bridging the gap between theoretical equations and physical reality through hands-on experimentation.

> Built for the **Even Semester Projects (2026)**, Coding Club, IIT Guwahati.

---

## ✨ Key Features

### 🤖 AI Experiment Assistant (Claude-Powered)

A floating chat bubble powered by the Anthropic Claude API (`claude-sonnet-4-20250514`). Students type natural-language prompts like *"set up a pendulum collision"* or *"build a Newton's cradle"* and the assistant:

- Responds with a plain-English explanation of the scene.
- Automatically calls spawn functions (`spawnBody`, `spawnRope`, `spawnSpring`, `spawnPivot`, `spawnMotor`, `clearBodies`) to materialize the described setup directly on the live physics canvas.
- Returns structured JSON `{ message, actions[] }` so every action is mapped to a precise Matter.js operation.
- Supports complex multi-body presets including **Newton's Cradle** (5 suspended balls with constraints) and **Pendulum Collision** setups out of the box.

### 🎥 Experiment Recorder & Replay

A full recording and replay system for physics simulations:

- **Record** — Captures every non-static body's position (`x`, `y`), angle, and velocity (`vx`, `vy`) at ~60 fps (every 16 ms) directly from the Matter.js engine with zero React re-render overhead.
- **Stop & Save** — Trims the recording to a 10-second cap and persists it to component state.
- **Replay** — Re-applies each saved snapshot to the engine via `Body.setPosition`, `setAngle`, and `setVelocity`, advancing frame-by-frame through the timeline.
- **Scrub** — A slider maps 0–1 across the full frame index so users can jump to any moment in the recording.
- **Playback Controls** — Play, Pause, Skip to Start, and Delete recording, displayed in an animated floating panel.

### 📊 Real-Time Analytics & Graphing

A floating analytics panel reads live data straight from the Matter.js engine and renders it as interactive charts:

- **Kinetic Energy (KE) Chart** — Area chart (via Recharts) showing KE over the last N ticks in real time.
- **Potential Energy (PE) Chart** — Complementary area chart tracking PE, letting students observe energy conservation visually.
- **Stat Badges** — Instant readouts for total KE, PE, body count, and simulation FPS.
- **Force Vector Overlay** — A full-screen SVG layer (`pointer-events: none`) that draws directional arrows on each body scaled to force magnitude; toggled independently of the chart panel.
- **EMA & Kalman Smoothing** — Backend `EMAProcessor` and `KalmanFilter` smooth noisy sensor streams before they reach the frontend analytics pipeline.
- **Prometheus Metrics** — `prom-client` exposes a `/metrics` endpoint for Grafana dashboards included in `backend/monitoring/`.

### 🔧 Interactive Physics Canvas

A web-based workspace for building, running, and interacting with 2D physics scenes:

- Drag-and-drop spawn of **rectangles**, **circles**, and **polygons** (hexagons and custom-sided shapes).
- Constraint tools: **Rope**, **Spring**, **Pivot joint**, **Motor** (continuous rotation), and **Pulley**.
- **Static Wall** placement for boundaries and fixtures.
- Click-to-select with a **Properties Panel** for editing mass, restitution, friction, and angular velocity on any body.
- **Body Ownership Overlay** — highlights which user in the session is currently dragging each body.
- **Live Cursors** — real-time cursor positions of every collaborator rendered on the canvas.
- Gravity toggle, global reset, and per-body delete.

### 👥 Multi-User Collaboration

- **Room Engine** — Each simulation runs in a named room; users join via a shareable room ID.
- **WebSocket Sync** — Physics deltas are broadcast at high frequency via Socket.io so every collaborator sees the same world state.
- **Redis Pub/Sub & Adapter** — Horizontal scaling across multiple Node processes; `@socket.io/redis-adapter` + `ioredis` route events correctly across instances.
- **Lock / Unlock Room** — The room owner can lock the canvas to prevent others from spawning or moving bodies.
- **Collab Sidebar** — Shows live peer list (online/offline indicators, roles), in-room chat, and a share link.
- **Rollback Worker** — Detects and corrects state divergence between clients using a sequence tracker and rollback snapshots.

### 📚 Experiment Library & Templates

- **Gallery view** — Browse, search, filter, and preview all saved physics scenarios.
- **Save / Load** — Serialize the full Matter.js world (bodies + constraints + metadata) to JSON and restore it later.
- **Share** — Make an experiment public or keep it private; other users can fork and remix.
- **Preset Templates** — Built-in starters (inclined plane, spring oscillator, projectile motion, etc.) accessible from `templates.js`.
- **Classroom Assignments** — Instructors can push a template to an entire room for guided lab sessions.

### 🔐 Auth & Permissions

- JWT-based authentication (`jsonwebtoken` + `bcryptjs`).
- Role system: **owner**, **editor**, **viewer** enforced on the backend via `permissions.js`.
- Audit log (`AuditLog` model + `AuditLogWriter`) for every state-mutating action in a room.
- Rate-limiting, CORS, and request validation middleware (`joi`).

### ⚙️ Worker & Queue System

- **Physics Worker** — Runs the Matter.js engine in a separate thread via `WorkerPool` to keep the main event loop free.
- **Analytics Worker** — Processes and aggregates frame data asynchronously.
- **Rollback Worker** — Monitors sequence gaps and triggers world reconciliation.
- **Bull Queues** — Durable job queues (backed by Redis) for analytics and rollback tasks.

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 + Vite | Core UI framework and build tool |
| Matter.js | 2D physics engine |
| Recharts | Area/line charts for KE/PE analytics |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Zustand | State management |
| Socket.io-client | Real-time WebSocket communication |
| Axios | HTTP API calls |

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Express.js | Server runtime and HTTP layer |
| MongoDB + Mongoose | Persistent data storage |
| Socket.io | WebSocket real-time engine |
| Redis + Bull | Pub/sub, scaling, job queues |
| Anthropic Claude API | AI Experiment Assistant |
| JWT + bcryptjs | Authentication and security |
| prom-client + Grafana | Monitoring and metrics |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local install or Atlas)
- Redis (local or cloud)

---

### 🍎 MongoDB Not Running? (macOS)

If the backend fails to connect to MongoDB, install and start it with Homebrew:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Verify it is running:

```bash
brew services list | grep mongodb
```

You should see `mongodb-community started`. MongoDB will then be available at `mongodb://localhost:27017`.

---

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/virtual-lab.git
cd virtual-lab
```

2. Set up the backend:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
MONGO_URI=mongodb://localhost:27017/virtuallab
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
PORT=5000
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

3. Set up the frontend:

```bash
cd ../frontend
npm install
```

---

### Running the Application

1. Make sure MongoDB and Redis are running.

2. Start the backend server:

```bash
cd backend
npm run dev
```

The backend runs with nodemon at `http://localhost:5000`.

3. Start the frontend client:

```bash
cd frontend
npm run dev
```

The Vite dev server is available at `http://localhost:5173`.

---

## 🗂️ Project Structure

```text
virtual-lab/
├── frontend/                        # React + Vite client
│   └── src/
│       ├── components/
│       │   ├── canvas/
│       │   │   ├── AIChatBubble.jsx         # AI Experiment Assistant (Claude API)
│       │   │   ├── AnalyticsPanel.jsx       # Live KE/PE charts + force vectors
│       │   │   ├── ExperimentRecorder.jsx   # Record, replay & scrub simulations
│       │   │   ├── PhysicsCanvas.jsx        # Matter.js canvas + spawn functions
│       │   │   ├── CanvasToolbar.jsx        # Shape & constraint tool palette
│       │   │   ├── CollabSidebar.jsx        # Peer list, chat, room sharing
│       │   │   ├── PropertiesPanel.jsx      # Per-body physics property editor
│       │   │   ├── LiveCursors.jsx          # Real-time collaborator cursors
│       │   │   ├── BodyOwnershipOverlay.jsx # Highlights who is dragging what
│       │   │   └── templates.js             # Built-in experiment presets
│       │   └── layout/
│       │       ├── AppShell.jsx
│       │       └── RouteGuards.jsx
│       ├── hooks/
│       │   ├── usePhysicsAnalytics.js       # Live KE/PE data hook
│       │   └── useMockAnalytics.js
│       ├── pages/
│       │   ├── RoomPage.jsx                 # Main simulation room
│       │   ├── DashboardPage.jsx
│       │   ├── AnalyticsPage.jsx
│       │   ├── LibraryPage.jsx
│       │   ├── SavedRoomsPage.jsx
│       │   └── AuthPage.jsx
│       ├── services/
│       │   ├── socket.js                    # Socket.io client + delta reconciliation
│       │   ├── api.js
│       │   └── experimentLibrary.js         # Save/load/serialize world state
│       └── stores/
│           ├── useAuthStore.js
│           ├── useRoomStore.js
│           └── useUIStore.js
│
└── backend/                         # Node.js + Express + Socket.io server
    └── src/
        ├── analytics/
        │   ├── AnalyticsPipeline.js
        │   ├── EMAProcessor.js              # Exponential moving average smoother
        │   └── KalmanFilter.js              # Kalman filter for noisy data
        ├── api/
        │   ├── controllers/                 # User, project, analytics controllers
        │   ├── middlewares/                 # Auth, rate-limit, validation
        │   └── routes/
        ├── auth/
        │   ├── jwtService.js
        │   └── permissions.js
        ├── models/                          # Mongoose schemas
        │   ├── User.js
        │   ├── Project.js
        │   ├── CollaborationSession.js
        │   ├── SimulationRoom.js
        │   ├── PhysicsObject.js
        │   ├── Constraint.js
        │   ├── EnvironmentPreset.js
        │   ├── ExperimentTemplate.js
        │   ├── AnalyticsFrame.js
        │   └── AuditLog.js
        ├── physics/
        │   ├── engine/
        │   │   ├── PhysicsEngine.js
        │   │   ├── FixedLoop.js
        │   │   └── Rollback.js
        │   └── plugins/
        │       ├── FluidDragPlugin.js
        │       ├── SpringDegradationPlugin.js
        │       └── ViscosityPlugin.js
        ├── queues/                          # Bull job queues (Redis-backed)
        ├── redis/                           # Cache, pub/sub, lock manager
        ├── sockets/
        │   ├── RoomManager.js
        │   └── handlers/index.js            # All socket event handlers
        ├── workers/
        │   ├── PhysicsWorker.js
        │   ├── AnalyticsWorker.js
        │   ├── RollbackWorker.js
        │   └── WorkerPool.js
        └── utils/
            ├── AuditLogWriter.js
            ├── SequenceTracker.js
            ├── logger.js
            └── metrics.js
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the project.
2. Create your feature branch:

```bash
git checkout -b feature/AmazingFeature
```

3. Commit your changes:

```bash
git commit -m "Add some AmazingFeature"
```

4. Push to the branch:

```bash
git push origin feature/AmazingFeature
```

5. Open a pull request.

---

## 🏫 Mentors & Acknowledgements

- **Project Mentor**: Prajit R.
- Developed as part of the **IIT Guwahati Coding Club** Even Semester Projects initiative.

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

Built with ❤️ at IIT Guwahati · Coding Club Even Semester Projects 2026

Matter.js · React · Socket.io · MongoDB · Redis · Claude AI

</div>
