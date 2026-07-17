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

Output: `frontend/dist/` (Vite production bundle).

### Production checklist

1. **Secrets:** strong `JWT_SECRET`, never commit `.env` / `render.env`
2. **MongoDB Atlas:** set `MONGODB_URI` on the API host
3. **JWT:** `JWT_EXPIRES_IN=7d` (avoid short values like `3m` in production)
4. **CORS / emails:** `CLIENT_URL` + `APP_BASE_URL` = public frontend URL (Vercel)
5. **Proxy:** `TRUST_PROXY=true` on Render/Railway/nginx
6. **Frontend (Vercel):** `VITE_API_URL=https://YOUR-API.onrender.com/api`
7. **Seed admin once:** `npm run seed:admin` on the API host
8. **Optional:** SMTP, Stripe, Groq/OpenAI, Easypaisa keys

Set `backend/.env` for production (`NODE_ENV=production`, strong `JWT_SECRET`, Atlas `MONGODB_URI`, `CLIENT_URL` matching your public site URL, `TRUST_PROXY=true` behind nginx/Railway/Render).

**Same-origin (API serves SPA):** build frontend first, then:

```powershell
# Windows PowerShell
$env:NODE_ENV="production"; npm run backend:start

# Or one-shot from root (builds then starts)
npm run start:prod
```

**Split deploy:** API on Render (no SPA required); frontend on Vercel with `VITE_API_URL`.

PM2 cluster:

```powershell
npm run build
npx pm2 start ecosystem.config.js
```

Health check: `GET /api/health`

## Split deploy (Vercel + Render + MongoDB Atlas)

Use this when the SPA and API run on different hosts. Local `npm run dev` is unchanged (Vite still proxies `/api` and `/uploads`).

| Piece | Host | Notes |
|-------|------|--------|
| Frontend | [Vercel](https://vercel.com) | Root Directory = `frontend`, build `npm run build`, output `dist`. Uses [`frontend/vercel.json`](frontend/vercel.json) for SPA rewrites. |
| Backend | [Render](https://render.com) | Root Directory = `backend`, start `npm start`. Optional Blueprint: [`render.yaml`](render.yaml). |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) | Free cluster; set `MONGODB_URI` on Render. |

### Deploy order

1. Create an Atlas cluster and copy `MONGODB_URI`.
2. Deploy the backend on Render (`backend` as root). Set at least: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `TRUST_PROXY=true`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Confirm `GET https://<your-api>/api/health`.
3. On Render, run admin seed once (Shell / one-off): `npm run seed:admin`.
4. Deploy the frontend on Vercel with env:
   - `VITE_API_URL=https://<your-api>.onrender.com/api`
   - optional: `VITE_STRIPE_PUBLISHABLE_KEY`
5. Set backend CORS/email bases to the Vercel URL, then redeploy Render:
   - `CLIENT_URL=https://YOUR-APP.vercel.app`
   - `APP_BASE_URL=https://YOUR-APP.vercel.app`

See [`frontend/.env.example`](frontend/.env.example) and [`backend/.env.example`](backend/.env.example) for the full production checklist (SMTP, AI keys, Stripe/Easypaisa).

**Uploads:** files are stored under `backend/uploads/` on the API disk. On Render’s free tier, redeploys/restarts can wipe that disk — fine for demos; use S3/Cloudinary later for durable media.

## Documentation

- [Phase 1 — document analysis](docs/PHASE1_DOCUMENT_ANALYSIS.md)
- [Phase 2 — system design](docs/PHASE2_SYSTEM_DESIGN.md)
- [API endpoints](docs/API_ENDPOINTS.md)
- [Setup & database](docs/SETUP_AND_DATABASE.md)

## Environment variables

**Backend** (see `backend/.env.example`): `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `HOLD_MINUTES`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

**Frontend** (see `frontend/.env.example`): leave `VITE_API_URL` unset for local Vite proxy or same-origin Express. For split deploy (Vercel), set `VITE_API_URL` to the full API base (e.g. `https://your-api.onrender.com/api`). Optional: `VITE_STRIPE_PUBLISHABLE_KEY`.
