# Sports Ecosystem Platform

Full-stack implementation aligned with **FYP26-CS-G22** SRS (Phase I) and SDD (Phase II): coaching, indoor ground booking (cricket & badminton), training and performance, equipment marketplace with listing quotas, JWT auth, RBAC, and admin verification.

## Repository layout

| Path | Description |
|------|-------------|
| `backend/` | Node.js + Express + MongoDB (Mongoose) REST API |
| `frontend/` | React (Vite) + Tailwind CSS SPA |
| `docs/` | Requirements analysis, architecture, API reference, setup |

## Quick start

### Prerequisites

- Node.js 18+
- MongoDB running locally or a cloud URI

### 1. Backend

From the **repo root** (after `npm install` inside `backend` once):

```powershell
npm run seed:admin
```

**Login:** use `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env`. If you changed the password in `.env` after the admin was already created, run **`npm run seed:admin:reset`** to sync the hash.  
**Do not** register the same email as a player — the seed script will not overwrite it and admin login will fail.

Or from **`backend/`**:

```powershell
cd backend
# If `.env` is missing: copy .env.example .env (or create it with at least MONGODB_URI)
npm install
npm run seed:admin
npm run dev
```

Ensure **MongoDB** is running locally on the default port, or set `MONGODB_URI` in `backend/.env` to your Atlas/cluster connection string.

API: `http://127.0.0.1:5000/api` · Health: `GET /api/health`

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: `http://127.0.0.1:5173` (proxies `/api` and `/uploads` to port 5000)

### 3. First login

Use the admin account from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) after `npm run seed:admin`. Register players, coaches, and business owners from the **Register** page.

## Tests (backend)

Requires `MONGODB_URI` in `backend/.env` (same as local dev).

```powershell
cd backend
npm test
```

## Production build

From the **repo root**:

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
npm run build
```

Output: `frontend/dist/`.

Set `backend/.env` for production (`NODE_ENV=production`, strong `JWT_SECRET`, Atlas `MONGODB_URI`, `CLIENT_URL` matching your public site URL, `TRUST_PROXY=true` behind nginx/Railway/Render).

Start API (also serves the SPA from `frontend/dist` when `NODE_ENV=production`):

```powershell
# Windows PowerShell
$env:NODE_ENV="production"; npm run backend:start

# Or one-shot from root (builds then starts)
npm run start:prod
```

PM2 cluster:

```powershell
npm run build
npx pm2 start ecosystem.config.js
```

Health check: `GET /api/health`

## Documentation

- [Phase 1 — document analysis](docs/PHASE1_DOCUMENT_ANALYSIS.md)
- [Phase 2 — system design](docs/PHASE2_SYSTEM_DESIGN.md)
- [API endpoints](docs/API_ENDPOINTS.md)
- [Setup & database](docs/SETUP_AND_DATABASE.md)

## Environment variables

**Backend** (see `backend/.env.example`): `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `HOLD_MINUTES`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

**Frontend** (optional): `VITE_API_URL` if not using the Vite dev proxy. In production with same-origin Express serving, leave unset (`/api` default).
