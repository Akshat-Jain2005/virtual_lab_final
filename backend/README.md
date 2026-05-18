# Virtual Lab Backend

Enterprise-grade distributed physics engine and collaboration platform.

## Features
- Multi-threaded Physics Worker Pool (Matter.js)
- 60Hz Fixed-Timestep authoritative simulation
- Client-side prediction & reconciliation
- WebSocket sequence anti-replay security
- Real-time observability (Prometheus + Grafana)
- Scalable MongoDB & Redis architecture

## Structure
- `src/api`: REST controllers and routes
- `src/physics`: Core simulation logic
- `src/workers`: Multi-threaded runner implementation
- `src/sockets`: Real-time event handling
- `src/analytics`: Performance and state analysis
- `src/redis`: Ephemeral state and locking
- `docker`: Orchestration and proxy configurations

## Deployment
```bash
cd backend/docker
docker-compose up -d
```
