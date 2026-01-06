## 0) First-time Setup

- Requirements: Docker Desktop (or Docker Engine), Node.js 18+ and npm.
- Install dependencies:

```bash
npm ci
npm --prefix backend ci
```

- Quick check:

```bash
npm run lint && npm run build
```

## 1) Run Locally

- Start Backend:

```bash
npm run backend:dev
```

- Start Frontend (point API to local backend):

```bash
VITE_API_URL=http://localhost:4000 npm run dev
```

- Access: Frontend `http://localhost:5173`, Backend health `http://localhost:4000/health`.

## 2) Deploy to Server (Windows + WSL, domain/IP 10.13.60.136)

- Requirements: Windows with Docker Desktop, enable WSL integration; share drive D for Docker.
- Report folders on host: ` /mnt/d/Project/global-cn/report_history` and ` /mnt/d/Project/global-qa/report_history`.
- Backend health check: `http://10.13.60.136:4000/health`
- Build FE pointing to backend via domain/IP and start the stack:

```bash
docker compose build --build-arg VITE_API_URL=http://10.13.60.136:4000 frontend && docker compose up -d
```

- Access: Frontend `http://10.13.60.136:5173`, Backend health `http://10.13.60.136:4000/health`.
- Stop services: `docker compose down`.

### Frontend on a different domain, call API via backend domain

- If you deploy FE at a different domain/IP than the backend (without Nginx proxy `/api/`), build FE with:
  - `VITE_API_URL=http://10.13.60.136:4000`
- Then FE will call APIs like:
  - `http://10.13.60.136:4000/api/...`

## 3) Run directly on Windows 11 (no Docker)

- Requirements:
  - Install Node.js 18+ and npm.
  - Optional: Local MongoDB (if using `DATA_PROVIDER=mongo`).
  - Open firewall for `TCP 4000` (backend) and `TCP 5173` (frontend dev/preview) if access from other machines is needed.

- Install dependencies:

```bash
npm ci
npm --prefix backend ci
```

- Backend Configuration:
  - Provided `backend/.env.windows` (Windows auto-loads this file), example:
    - `DATA_PROVIDER=mongo`
    - `MONGO_URI=mongodb://localhost:27017`
    - `MONGO_DB_NAME=mydb`
    - `PORT=4000`
    - `FILES_DEBUG=1`
    - `SERENITY_HISTORY_DIR=D://Project//global-qa//report_history`
    - `SERENITY_HISTORY_DIR_CN=D://Project//global-cn//report_history`
  - Backend automatically loads `.env.windows` on Windows. You may rename `backend/.env.windows` to `backend/.env` if preferred.

- Start Backend:

```bash
npm run backend:start
```

- Verify:
  - Health: `http://localhost:4000/health`
  - From another machine in LAN: `http://10.13.60.136:4000/health`

- Start Frontend (dev):
  - FE calls API via backend domain (to access from another machine/domain): set `VITE_API_URL=http://10.13.60.136:4000`
  - PowerShell:

```powershell
$env:VITE_API_URL='http://10.13.60.136:4000'; npm run dev
```

- CMD:

```cmd
set VITE_API_URL=http://10.13.60.136:4000 && npm run dev
```

- Access:
  - On server: Frontend `http://localhost:5173`
  - From another machine: Frontend `http://10.13.60.136:5173`

- Build and preview FE pointing to backend via domain:

```bash
VITE_API_URL=http://10.13.60.136:4000 npm run build && npm run preview -- --host 0.0.0.0 --port 5173
```
