# Squidbox Service (API + Worker)

Backend for the Expo app. Express API + background worker. Jobs are queued with Redis + BullMQ, data in Postgres, and large media is downloaded to a persistent `/data` volume before further processing.

## What's included

- Express API with JWT auth (register/login/me)
- OAuth token storage for multiple platforms (Twitter, Bluesky, OnlyFans, JFF)
- Background worker that downloads media to `/data/downloads`
- Queue: Redis + BullMQ (cloud‑agnostic)
- Database: Postgres via Prisma
- Docker Compose for `db`, `redis`, `api`, `worker`
- Health check with database connectivity verification

## First-time setup/run (local)

```bash
# install deps
nvm use && npm install

# env
cp env.example .env

# initialize database (starts Postgres in Docker and applies migrations)
npm run db:migrate -- init

# start local dev (starts Redis+Postgres and runs API+worker with hot reload)
npm start

# health
curl http://localhost:8080/health
```

**Note:** The setup uses port 5433 for host-to-Docker database connections to avoid conflicts with local Postgres installations.

## Consecutive runs (local)

```bash
npm start
```

## Useful Commands

### Clean up Docker containers and volumes

```bash
docker compose down -v --remove-orphans
```

### Check health

```bash
curl http://localhost:8080/health
```

Returns:

- `{"ok": true, "database": "connected", "timestamp": "..."}` when healthy
- `{"ok": false, "database": "disconnected", "error": "..."}` when database is down

### Create a development user

```bash
# Create a dev user with predefined credentials
pnpm db:create-dev-user
```

This creates a user with:

- Email: `dev@example.com` (or `EXPO_PUBLIC_DEV_USER_EMAIL` if set)
- Password: `devpassword123` (or `EXPO_PUBLIC_DEV_USER_PASSWORD` if set)

The script will use the same environment variables that the mobile app uses for consistency.

Or create a custom test user:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## Migrations (schema changes)

```bash
# after editing prisma/schema.prisma
npm run db:migrate -- add_some_table
```

## Deploy (Fly.io + Neon)

### Prereqs

- [Fly.io](https://fly.io) for Servers,
- [Neon](https://neon.com) for Postgres
- CLI: `brew install flyctl` then `fly auth login`

### Create Neon DB and get `DATABASE_URL`

- In Neon, create a project and a database
- Copy the production connection string. It must start with `postgresql://...`

### Create `.env.production`

```ini
DATABASE_URL=your-neon-connection-string
JWT_SECRET=your-long-random-secret
```

To create a new JWT Secret run

```bash
openssl rand -base64 48
```

### Deploy (also to update)

```bash
npm run deploy:fly
```

What the script does

- Runs Prisma migrations against `DATABASE_URL`
- Creates and deploys three Fly apps if missing:
  - `squidbox-redis` (private, Redis with a small volume)
  - `squidbox-api` (public API on HTTPS)
  - `squidbox-worker` (private worker with a 100GB volume at `/data`)
- Sets `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL` as Fly secrets

Check status / URL

```bash
fly status -a squidbox-api
# Public URL is shown as Hostname, e.g. https://squidbox-api.fly.dev
```

### Redis

We run a small Redis for the worker queue ([BullMQ](https://docs.bullmq.io)) on [Fly.io](https://fly.io).
If usage grows and data becomes more valuable, consider moving to [Upstash Redis](https://upstash.com/) for a
fully managed option.

## Using from Expo

- Host mapping
  - iOS simulator: http://localhost:8080
  - Android emulator: http://10.0.2.2:8080
  - Physical device: http://<your-mac-lan-ip>:8080

- Auth
  - POST /api/auth/register { email, password }
  - POST /api/auth/login { email, password } → Bearer token
  - GET /api/me with Authorization: Bearer <token>
  - POST /auth/tokens { platform, accessToken, refreshToken, expiresIn, username, userId } with Authorization: Bearer <token>

- Create a post job (enqueue to worker)
  - POST /api/posts { postTo: string[], post: { text: string, media: { type: 'image'|'video', source: string }[] } }
  - GET /api/jobs/:id/status

## Endpoints

- API (8080)
  - GET /health - Health check with database connectivity
  - POST /api/auth/register - User registration
  - POST /api/auth/login - User login
  - GET /api/me - Get current user info
  - POST /auth/tokens - Store OAuth tokens for platforms
  - POST /api/posts - Create post job
  - GET /api/jobs/:id/status - Check job status

Worker runs internally; no public endpoints.
