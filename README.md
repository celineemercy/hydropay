# HydroPay

HydroPay is a smart dispenser transaction monitor. The project contains an ESP32 dispenser sketch, a Node.js backend that records transaction events in MongoDB, and a React dashboard for viewing QRIS payment and dispenser transaction status.

## Project Structure

```text
.
|-- backend/             # Express + Socket.IO backend
|-- api/                 # Vercel serverless API functions
|-- firmware/            # ESP32 dispenser firmware
|-- frontend/            # Vite + React + TypeScript dashboard
|-- docker-compose.yml   # Backend, MongoDB, and frontend containers
|-- vercel.json          # Vercel build, output, and rewrite config
|-- package.json         # Root Node package metadata
`-- .env                 # Local environment values
```

## Tech Stack

- Backend: Node.js, Express, Socket.IO
- Database: MongoDB
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Runtime/deployment: Docker, Docker Compose, Nginx
- Vercel deployment: Vite static frontend + Node.js serverless API functions
- Firmware: ESP32, Arduino IDE, ESP-NOW, HTTPClient

## Features

- Transaction dashboard for successful and failed dispenser payments
- Summary metrics for total records, success count, and failure count
- Backend API for hardware transaction submissions
- MongoDB persistence for recent transaction records
- Frontend polling of recent transactions from the backend API
- Socket.IO backend event relay for dispenser screen/status updates and transaction updates
- Dockerized frontend, backend, and MongoDB services
- Vercel-ready API functions for production deployment with MongoDB Atlas

## Prerequisites

- Node.js 20 or newer
- npm
- Docker and Docker Compose, if running with containers
- MongoDB, if running the backend locally outside Docker
- Arduino IDE and the ESP32/ILI9341/touch/QR code dependencies, if compiling the firmware

## Run With Docker Compose

From the project root:

```bash
docker compose up --build
```

Or use the npm shortcut:

```bash
npm run docker:up
```

Then open:

- Frontend dashboard: `http://localhost:3000`
- Backend server: `http://localhost:8086`
- MongoDB: `localhost:27017`

Run in the background:

```bash
npm run docker:up:detached
```

Check running services:

```bash
npm run docker:ps
```

View container logs:

```bash
npm run docker:logs
```

To stop the containers:

```bash
npm run docker:down
```

Optional port overrides:

```bash
FRONTEND_PORT=3001 BACKEND_PORT=8087 MONGO_PORT=27018 docker compose up --build
```

## Run Locally

### Backend

```bash
cd backend
npm install
node server.js
```

The backend listens on `http://localhost:8086` by default. It expects MongoDB to be reachable through `MONGODB_URI`; when running outside Docker, set it to a local database such as `mongodb://localhost:27017`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will print the local dashboard URL, usually `http://localhost:5173`.

The Vite dev server is not configured with an API proxy. If you run the frontend locally, make sure backend API requests to `/api/transactions` are routed to the backend, or use Docker Compose where Nginx proxies `/api/` and `/socket.io/` to the backend service.

## Build Frontend

```bash
cd frontend
npm run build
```

The production build is written to `frontend/dist`.

## Deploy To Vercel

The production deployment target is:

- Vercel static hosting for `frontend/dist`
- Vercel Functions in `api/`
- MongoDB Atlas or another public MongoDB connection string

The local Docker MongoDB service is not available on Vercel. Create a MongoDB Atlas cluster, then add these environment variables in the Vercel project settings:

```text
MONGODB_URI=mongodb+srv://...
MONGODB_DB=hydropay
MONGODB_COLLECTION=transactions
CORS_ORIGIN=https://your-hydropay-project.vercel.app
HARDWARE_API_KEY=replace-with-a-long-random-device-secret
```

`vercel.json` builds the frontend from `frontend/`, serves `frontend/dist`, exposes `/api/*` functions, and rewrites `/health` to `/api/health`.

After deployment, update the firmware endpoint to:

```text
https://your-hydropay-project.vercel.app/api/hardware/transactions
```

If `HARDWARE_API_KEY` is set in Vercel, the firmware must send the same value with the `x-hydropay-device-key` header.

## Firmware Workflow

Open `firmware/hydropay_dispenser/hydropay_dispenser.ino` from Arduino IDE. The sketch displays QRIS payment choices, waits for the user to confirm payment, sends pump commands over ESP-NOW, and posts transaction results to:

```text
POST /api/hardware/transactions
```

Before uploading, update the Wi-Fi credentials, backend URL, hardware API key, pump receiver MAC address, and QRIS payloads in the sketch. The firmware folder also expects `qris_qrc.h` to be present beside the `.ino` file.

## Environment Variables

The backend reads environment variables from the process environment or from `backend/.env`:

```text
PORT=8086
HOST=0.0.0.0
CORS_ORIGIN=*
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=hydropay
MONGODB_COLLECTION=transactions
HARDWARE_API_KEY=replace-with-a-long-random-device-secret
```

Docker Compose sets the backend container values for `PORT`, `HOST`, `MONGODB_URI`, `MONGODB_DB`, `MONGODB_COLLECTION`, and optionally `HARDWARE_API_KEY`. The root `.env` is only used by Docker Compose for variable substitution such as `FRONTEND_PORT`, `BACKEND_PORT`, `MONGO_PORT`, or `HARDWARE_API_KEY`; the current backend does not read MQTT variables. Keep real credentials, private broker details, and production database URLs out of commits.

## Backend API

The backend exposes:

- `GET /health`: health check endpoint
- `GET /api/health`: Vercel health check endpoint
- `GET /api/transactions`: returns the 50 most recent transactions from MongoDB
- `POST /api/hardware/transactions`: accepts hardware transaction payloads

Hardware transaction payload:

```json
{
  "amount": 5000,
  "status": "Success",
  "details": "QRIS payment accepted - 300 ml"
}
```

`status` is normalized to lowercase and must be either `success` or `failed`. Successful inserts are emitted over Socket.IO as `transaction:update`.

When `HARDWARE_API_KEY` is configured, `POST /api/hardware/transactions` requires:

```text
x-hydropay-device-key: your-secret-value
```

## Socket.IO Events

The backend currently handles:

- `klik_tombol`: received from a connected client or device
- `ganti_layar`: broadcast by the backend after `klik_tombol`
- `transaction:update`: broadcast after a new hardware transaction is stored

The backend also exposes `GET /health` for Docker health checks.

The frontend dashboard starts with local sample transaction data, then calls `GET /api/transactions` immediately and every 5 seconds. If the API call succeeds, the dashboard replaces the sample rows with backend data.

## Useful Commands

```bash
# Start production-like containers
npm run docker:up

# Stop containers
npm run docker:down

# Show container status
npm run docker:ps

# Build frontend assets
cd frontend
npm run build

# Run frontend dev server
cd frontend
npm run dev

# Run backend server
cd backend
node server.js
```

## Notes

- `frontend/Dockerfile` builds the React app and serves it with Nginx.
- Nginx proxies `/api/` and `/socket.io/` to the backend container.
- The React dashboard keeps sample transactions as an initial fallback while it polls backend data.
- Vercel production does not use Socket.IO; the dashboard relies on polling `GET /api/transactions`.
