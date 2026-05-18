# Virtual Lab

Built for the Even Semester Projects (2026), Coding Club, IIT Guwahati.

## Overview

Teaching complex physics and engineering concepts online is often limited to static videos and non-interactive text, failing to build intuition for dynamic physical systems. Virtual Lab addresses this by providing a "Digital Twin" environment: a collaborative 2D physics sandbox designed for university-level learning.

The platform allows multiple users to build machines, test structural integrity, and observe real-time forces in a shared, high-fidelity workspace, effectively bridging the gap between theoretical equations and physical reality through hands-on experimentation.

## Key Features

- **Interactive Physics Canvas**: A web-based workspace allowing users to drag, drop, and configure physical bodies, shapes, and materials.
- **Multi-User Room Engine**: A backend system managing synchronized states across users to ensure a seamless, shared physical experience in real time.
- **Physics Accuracy & Constraint System**: Integration of a 2D physics engine (Matter.js) with a functional UI toolset for creating mechanical connections like ropes, springs, pivots, and motorized components.
- **Real-Time Analytics Dashboard**: An integrated panel that generates live line charts and vector arrows to visualize velocity, kinetic energy, and forces acting on specific components.
- **Experiment Library**: A gallery view where users can browse, save, share, and load pre-configured physics scenarios or "lab templates" for classroom assignments.
- **Agent Middleware**: A high-frequency synchronization layer that broadcasts physics engine deltas to minimize network lag and resolve state conflicts between collaborators.


## Technology Stack

### Frontend

- **Core**: React.js, Vite
- **Physics & Visualization**: Matter.js, Recharts
- **Styling & UI**: Tailwind CSS, Framer Motion, Lucide React
- **State Management**: Zustand
- **Networking**: Socket.io-client, Axios

### Backend

- **Core**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)
- **Real-Time Engine**: WebSockets (Socket.io)
- **Scaling & Queues**: Redis (ioredis, @socket.io/redis-adapter), Bull
- **Security & Auth**: JSON Web Tokens (jsonwebtoken), bcryptjs, CORS
- **Monitoring**: prom-client

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB instance (local or Atlas)
- Redis server (local or cloud)

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

Create a `.env` file in the `backend` directory and add your environment variables (MongoDB URI, Redis connection URL, JWT secret).

3. Set up the frontend:

```bash
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server:

```bash
cd backend
npm run dev
```

The backend runs with nodemon for local development at http://localhost:5000 (or your configured port).

2. Start the frontend client:

```bash
cd frontend
npm run dev
```

The Vite development server is typically available at http://localhost:5173.

## Project Structure

```text
virtual-lab/
|-- frontend/             # React + Vite client application
|   |-- public/           # Static assets
|   |-- src/              # UI components, Zustand stores, canvas logic, routing
|   `-- package.json
`-- backend/              # Node.js + Express + Socket.io server
    |-- src/              # Routes, controllers, physics workers, Redis pub/sub
    |-- docker/           # Dockerization and Nginx configs
    `-- package.json
```

## Contributing

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

## Mentors & Acknowledgements

- **Project Mentor**: Prajit R.
- Developed as part of the IIT Guwahati Coding Club Even Semester Projects initiative.

## License

This project is licensed under the ISC License.
