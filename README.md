# HydroPay

HydroPay is a smart dispenser transaction monitor. The project contains a Node.js backend that serves Socket.IO events and a React dashboard for viewing QRIS payment and dispenser transaction status.

## Project Structure

```text
.
|-- backend/             # Express + Socket.IO backend
|-- frontend/            # Vite + React + TypeScript dashboard
|-- docker-compose.yml   # Backend and frontend production containers
|-- package.json         # Root Node package metadata
`-- .env                 # Local environment values
```

## Tech Stack

- Backend: Node.js, Express, Socket.IO
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Runtime/deployment: Docker, Docker Compose, Nginx

## Features

- Transaction dashboard for successful and failed dispenser payments
- Summary metrics for total records, success count, and failure count
- Socket.IO backend event relay for dispenser screen/status updates
- Dockerized frontend and backend services

## Prerequisites

- Node.js 20 or newer
- npm
- Docker and Docker Compose, if running with containers

## Run With Docker Compose

From the project root:

```bash
docker compose up --build
```

Then open:

- Frontend dashboard: `http://localhost:3000`
- Backend server: `http://localhost:8086`

To stop the containers:

```bash
docker compose down
```

## Run Locally

### Backend

```bash
cd backend
npm install
node server.js
```

The backend listens on `http://localhost:8086`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will print the local dashboard URL, usually `http://localhost:5173`.

## Build Frontend

```bash
cd frontend
npm run build
```

The production build is written to `frontend/dist`.

## Environment Variables

The root `.env` currently defines values for local port and MQTT topics:

```text
PORT=
MQTT_BROKER_URL=
MQTT_TOPIC_COMMAND=
MQTT_TOPIC_STATUS=
```

The current `backend/server.js` implementation listens on port `8086` directly and does not yet read these variables. Keep real credentials or private broker details out of commits.

## Socket.IO Events

The backend currently handles:

- `klik_tombol`: received from a connected client or device
- `ganti_layar`: broadcast by the backend after `klik_tombol`

The frontend dashboard currently uses local sample transaction data. The hook in `frontend/src/hooks/useTransactionData.ts` includes notes for replacing the sample data with Socket.IO updates or an API polling endpoint.

## Useful Commands

```bash
# Start production-like containers
docker compose up --build

# Stop containers
docker compose down

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
- Nginx proxies `/socket.io/` to the backend container for WebSocket support.
- The React dashboard currently displays sample transactions from `useTransactionData`.
