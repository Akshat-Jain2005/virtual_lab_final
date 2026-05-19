# ⚛ Virtual Lab — Frontend

Collaborative 2D physics sandbox built with React, Matter.js, and the Claude AI API.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Demo Login (no backend needed)

```
Email:    demo@virtuallab.io
Password: demo1234
```

All API calls fall back to mock stubs in demo mode — the canvas, AI assistant, recorder, and analytics panels all work offline.

---

## Features

### 🤖 AI Experiment Assistant

`src/components/canvas/AIChatBubble.jsx`

A floating chat bubble powered by the Anthropic Claude API (`claude-sonnet-4-20250514`). Students type natural language like *"set up a pendulum collision"* or *"build a Newton's cradle"* and the assistant:

- Responds with a plain-English description of the scene.
- Returns structured JSON `{ message, actions[] }` where each action maps directly to a Matter.js spawn function (`spawnBody`, `spawnRope`, `spawnSpring`, `spawnPivot`, `spawnMotor`, `clearBodies`).
- Executes actions against the live `engineRef` to materialize objects on the canvas instantly.
- Ships with built-in multi-body helpers: **Newton's Cradle** (5 suspended balls + constraints) and **Pendulum Collision** setups.

### 🎬 Experiment Recorder & Replay

`src/components/canvas/ExperimentRecorder.jsx`

Records a running simulation as a JSON timeline and replays it frame-by-frame.

- **Record** — Snapshots every non-static body's `{ id, x, y, angle, vx, vy }` at ~60 fps (every 16 ms) via a ref — zero React re-render overhead.
- **Stop & Save** — Automatically trims the recording to a 10-second cap and saves to state.
- **Replay** — Re-applies each frame to the engine using `Body.setPosition`, `Body.setAngle`, and `Body.setVelocity`.
- **Scrub** — A slider maps 0–1 across the full frame index so you can jump to any moment.
- **Controls** — Play, Pause, Skip to Start, Delete — rendered in an animated floating panel.

### 📊 Live Analytics & Graphing

`src/components/canvas/AnalyticsPanel.jsx` · `src/hooks/usePhysicsAnalytics.js`

A floating panel that reads data directly from the Matter.js engine and renders interactive charts.

- **Kinetic Energy chart** — `AreaChart` (Recharts) updated every tick in real time.
- **Potential Energy chart** — Complementary area chart; together they let students observe energy conservation.
- **Stat badges** — Instant numeric readouts for total KE, PE, body count, and simulation FPS.
- **Force Vector Overlay** — Full-screen SVG layer (pointer-events: none) drawing directional arrows on each body, scaled to force magnitude. Toggled independently of the chart panel.
- **Analytics Page** — `/room/:id/analytics` offers a dedicated full-page view with `LineChart` and `AreaChart` breakdowns of KE, PE, and total energy over time, calculated from a room snapshot.

### 🧱 Physics Canvas

`src/components/canvas/PhysicsCanvas.jsx`

The core simulation workspace powered by Matter.js.

- Spawn **rectangles**, **circles**, and **polygons** (hexagons and custom-sided shapes) via drag-and-drop or the AI assistant.
- Constraint tools: **Rope**, **Spring**, **Pivot joint**, **Motor** (continuous rotation), **Pulley**.
- **Static Wall** placement for boundaries and fixtures.
- Click-to-select body with a Properties Panel editor.
- Gravity toggle, global reset, per-body delete.
- Exports `spawnBody`, `spawnRope`, `spawnSpring`, `spawnPivot`, `spawnMotor`, `spawnPulley`, `clearBodies` — used by both the toolbar and the AI assistant.

### 🛠 Canvas Toolbar

`src/components/canvas/CanvasToolbar.jsx`

Tool palette for the physics canvas:

- **Select** tool (pointer) for clicking and dragging bodies.
- Shape tools: Rectangle, Circle, Polygon (hexagon).
- Constraint tools: Rope/Link, Spring (⚡), Pivot (crosshair), Motor (rotating arrows), Wall (brick icon).
- Trash / clear-all button.
- Collapsible panel with animated transitions via Framer Motion.

### 🔧 Properties Panel

`src/components/canvas/PropertiesPanel.jsx`

Click any body to open a live editor for:

- Mass, density, restitution (bounciness), friction.
- Angular velocity and rotation lock.
- Label / name.
- Delete body button.

Changes are applied to the live engine immediately.

### 👥 Collaboration Sidebar

`src/components/canvas/CollabSidebar.jsx`

- **Peer list** — shows every user in the room with online/offline indicators, role badges (owner / editor / viewer), and avatar colors.
- **In-room chat** — real-time message feed; send with Enter or the Send button.
- **Share link** — one-click copy of the room URL.
- **Lock / Unlock** — room owner can freeze the canvas to prevent others from spawning or moving bodies.
- Collapsible panel, slides in/out with Framer Motion.

### 🖱 Live Cursors

`src/components/canvas/LiveCursors.jsx`

Renders every collaborator's cursor position on the canvas as a colored pointer with their username label, updated in real time via Socket.io `peer:cursor` events.

### 🏷 Body Ownership Overlay

`src/components/canvas/BodyOwnershipOverlay.jsx`

SVG overlay that highlights which user is currently grabbing/dragging each body, using that user's room color.

### 📚 Experiment Library

`src/pages/LibraryPage.jsx` · `src/services/experimentLibrary.js`

- Gallery view — browse, search, and filter all saved physics scenarios.
- Save a full world snapshot (bodies + constraints + metadata) as JSON.
- Load / fork any experiment into the current room.
- Mark experiments public or private.
- Built-in preset templates accessible from `src/components/canvas/templates.js`.

### 🔐 Auth & Route Guards

`src/pages/AuthPage.jsx` · `src/components/layout/RouteGuards.jsx`

- JWT stored via Zustand + persist (`useAuthStore`).
- `PrivateRoute` — redirects to `/auth` if not logged in.
- `RoomRoute` — validates room membership before mounting the canvas.
- `AdminRoute` — restricts `/admin/metrics` to admin users.

---

## Routes

| Path | Guard | Component |
|---|---|---|
| `/auth` | Public | AuthPage |
| `/dashboard` | PrivateRoute | DashboardPage |
| `/profile` | PrivateRoute | ProfilePage |
| `/library` | PrivateRoute | LibraryPage |
| `/library/:projectId` | PrivateRoute | LibraryDetailPage |
| `/room/:id` | RoomRoute | RoomPage |
| `/room/:id/analytics` | RoomRoute | AnalyticsPage |
| `/admin/metrics` | AdminRoute | AdminMetricsPage |

---

## Architecture

```
src/
├── components/
│   ├── canvas/
│   │   ├── AIChatBubble.jsx          # Claude AI assistant — spawns scenes from text
│   │   ├── AnalyticsPanel.jsx        # Live KE/PE charts + force vector overlay
│   │   ├── ExperimentRecorder.jsx    # 60fps record → replay → scrub
│   │   ├── PhysicsCanvas.jsx         # Matter.js engine + spawn exports
│   │   ├── CanvasToolbar.jsx         # Shape & constraint tool palette
│   │   ├── PropertiesPanel.jsx       # Per-body physics property editor
│   │   ├── CollabSidebar.jsx         # Peer list, chat, lock, share
│   │   ├── LiveCursors.jsx           # Real-time collaborator cursors
│   │   ├── BodyOwnershipOverlay.jsx  # Highlights who is dragging what
│   │   └── templates.js             # Built-in experiment presets
│   └── layout/
│       ├── AppShell.jsx              # Top nav, sidebar shell
│       └── RouteGuards.jsx           # PrivateRoute, RoomRoute, AdminRoute
├── hooks/
│   ├── usePhysicsAnalytics.js        # Live KE/PE data pipeline from engine
│   └── useMockAnalytics.js           # Demo-mode analytics stub
├── pages/
│   ├── RoomPage.jsx                  # Main simulation room (all canvas components)
│   ├── AnalyticsPage.jsx             # Full-page energy & telemetry charts
│   ├── DashboardPage.jsx             # Room list, create/join room
│   ├── LibraryPage.jsx               # Experiment gallery
│   ├── SavedRoomsPage.jsx
│   ├── AuthPage.jsx                  # Login / register
│   └── OtherPages.jsx                # Profile, Admin, 404
├── stores/
│   ├── useAuthStore.js               # Zustand + persist — JWT, user
│   ├── useRoomStore.js               # Zustand + subscribeWithSelector — physics state, peers, chat
│   └── useUIStore.js                 # Global UI toggles (panels, modals)
├── services/
│   ├── socket.js                     # Socket.io-client — single shared instance, graceful fallback
│   ├── api.js                        # Axios instance + mock stubs for demo mode
│   └── experimentLibrary.js          # Save / load / serialize world state
└── lib/
    └── utils.js                      # cn() Tailwind class helper
```

---

## Socket.io Contract

### Client emits

| Event | Payload |
|---|---|
| `room:join` | `{ roomId, token }` |
| `room:create` | `{ roomId?, settings }` |
| `room:leave` | `{ roomId }` |
| `physics:grab` | `{ roomId, bodyId, seqId }` |
| `physics:release` | `{ roomId, bodyId, seqId }` |
| `cursor:move` | `{ roomId, x, y }` |
| `simulation:play` | `{ roomId }` |
| `simulation:pause` | `{ roomId }` |
| `simulation:reset` | `{ roomId }` |
| `experiment:save` | `{ roomId, snapshot }` |

### Server broadcasts

| Event | Payload |
|---|---|
| `physics:delta` | `{ roomId, seq, ts, bodies: [{ id, x, y, angle, vx, vy, va }] }` |
| `room:peers` | `{ roomId, peers: [{ userId, username, color, cursor, isOnline }] }` |
| `peer:cursor` | `{ userId, x, y }` |
| `physics:body-grabbed` | `{ bodyId, userId }` |
| `physics:body-released` | `{ bodyId }` |
| `room:user-joined` | `{ userId, username }` |
| `room:user-left` | `{ userId }` |

---

## Tech Stack

| Category | Library |
|---|---|
| Framework | React 18, Vite |
| Physics | Matter.js |
| Charts | Recharts (AreaChart, LineChart) |
| Styling | Tailwind CSS, Framer Motion |
| Icons | Lucide React |
| Toasts | Sonner |
| State | Zustand (persist, subscribeWithSelector) |
| Networking | Socket.io-client, Axios |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |

---

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

---

## Available Scripts

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
npm run lint     # ESLint check
```
