# ZEN GAUGE

Stress-to-action app with a **frontend** (React + Vite) and **backend** (Node + Express).

## Structure

| Folder      | Role |
|------------|------|
| **frontend/** | React UI, games, AI/ML client services (Vite, TensorFlow.js, Gemini) |
| **backend/**  | API server (Express). Add routes here for auth, persistence, AI proxy, etc. |

## Run

- **Frontend only** (default):  
  `npm run dev` or `npm run dev:frontend`  
  → http://localhost:3333

- **Backend only**:  
  `npm run dev:backend` or `npm run start:backend`  
  → http://localhost:3334

- **Both**: run `npm run dev:frontend` and `npm run dev:backend` in two terminals.

## First-time setup

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

Then from the project root: `npm run dev` (frontend) and optionally `npm run dev:backend` (backend).
