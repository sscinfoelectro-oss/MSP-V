# Smart Automotive Diagnostic Platform

A full-stack application with a React frontend and Node.js backend.

## Run locally

Install dependencies:

```bash
npm install
```

Start the platform:

```bash
npm run dev
```

Open the frontend at `http://localhost:5173`.

If `npm` is not available globally, run the app with the bundled Node copy:

```bash
.\node\node-v18.17.0-win-x64\npm.cmd run dev
```

## Backend API

- `GET /api/vehicles` - list available vehicles
- `GET /api/vehicles/:id/diagnostics` - get diagnostics for a specific vehicle
- `GET /api/status` - platform status
