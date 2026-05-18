# ⚛ VIRTUAL-LAB — Frontend Phase 1

Collaborative 2D physics sandbox — hackathon-ready foundation.

## Quick Start

```bash
npm install
npm run dev
```
Open http://localhost:5173

## Demo Login
Email: `demo@virtuallab.io`  
Password: `demo1234`  
(All API calls are stubbed — no backend needed for demo)

## Architecture

```
src/
├── components/
│   ├── layout/       AppShell, RouteGuards
│   ├── canvas/       (Phase 2: Matter.js canvas)
│   ├── auth/
│   ├── dashboard/
│   ├── room/
│   ├── analytics/
│   └── library/
├── pages/
│   ├── AuthPage.jsx          /auth
│   ├── DashboardPage.jsx     /dashboard
│   ├── RoomPage.jsx          /room/:id
│   ├── AnalyticsPage.jsx     /room/:id/analytics
│   ├── LibraryPage.jsx       /library
│   └── OtherPages.jsx        /profile, /admin/metrics, /library/:id, 404
├── stores/
│   ├── useAuthStore.js       Zustand + persist (JWT, user)
│   ├── useRoomStore.js       Zustand + subscribeWithSelector (physics state)
│   └── useUIStore.js         Global UI toggles
├── services/
│   ├── api.js                Axios + mock stubs
│   └── socket.js             Socket.io-client + graceful fallback
└── lib/
    └── utils.js              cn() helper
```

## Routes & Guards

| Path                    | Guard         | Component           |
|-------------------------|---------------|---------------------|
| `/auth`                 | Public        | AuthPage            |
| `/dashboard`            | PrivateRoute  | DashboardPage       |
| `/profile`              | PrivateRoute  | ProfilePage         |
| `/library`              | PrivateRoute  | LibraryPage         |
| `/library/:projectId`   | PrivateRoute  | LibraryDetailPage   |
| `/room/:id`             | RoomRoute     | RoomPage            |
| `/room/:id/analytics`   | RoomRoute     | AnalyticsPage       |
| `/admin/metrics`        | AdminRoute    | AdminMetricsPage    |

## Socket.io Contract
Client emits: `room:join`, `room:create`, `room:leave`, `physics:grab`,
`physics:release`, `cursor:move`, `simulation:play/pause/reset`, `experiment:save`

Server broadcasts: `room:user-joined`, `room:user-left`, `cursor:moved`,
`physics:delta`, `physics:body-grabbed`, `physics:body-released`

## Phase 2 → Matter.js Canvas
Mount point: `#physics-canvas-mount` in RoomPage.
Stores: `useRoomStore.bodies[]`, `useRoomStore.applyPhysicsDelta()`
Socket: `onPhysicsDelta()` → 60Hz body state updates
