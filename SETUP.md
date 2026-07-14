# Apex.ai Local Setup

## Prerequisites
- Node.js 20 LTS
- PostgreSQL (local or cloud)

## First-time setup

1. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Create server environment file**
   ```bash
   cp .env.example server/.env
   ```
   Edit `server/.env` and fill in:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `JWT_ACCESS_SECRET` — any 32+ character random string
   - `JWT_REFRESH_SECRET` — any different 32+ character random string
   - `GEMINI_API_KEY` — from https://aistudio.google.com/

3. **Run database migrations**
   ```bash
   cd server
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 — Backend
   cd server && npm run dev

   # Terminal 2 — Frontend
   cd client && npm run dev
   ```

5. **Open the app**
   - Frontend: http://localhost:5173
   - Backend health: http://localhost:4000/health

## Test accounts
Register at http://localhost:5173/register — no pre-seeded accounts exist.

## Notes
- The `server/prisma/migrations/` folder currently only contains a README. You **must** run
  `npx prisma migrate dev --name init` inside `server/` before starting the backend.
- The root `package.json` includes a `dev` script that starts both servers concurrently:
  ```bash
  npm install          # installs concurrently at root
  npm run dev          # starts server + client in parallel
  ```
