## Squidbox v2 Monorepo

Shared TypeScript monorepo with:

- `apps/api` — Express backend (dev on 3000), background worker (3001)
- `apps/mobile` — Expo app (Metro on 8081)
- `packages/contracts` — shared types and Zod schemas
- `packages/twitter-api` — Twitter API client

### Requirements

- Node `20.17.0` (`.nvmrc`)
- pnpm (managed via Corepack)

### First-time setup

```bash
nvm use
corepack enable
corepack prepare pnpm@9.12.3 --activate || npm i -g pnpm@9.12.3
pnpm i
```

#### Environment variables

TODO! Add documentation. Right now, the .env files are in each package.
Maybe we should have one .env at the root to make setup more simple?

#### Start docker services and create database

```bash
pnpm dev:setup
```

### Development

We use docker to run postgres and redis for development.

```bash
pnpm dev
```

#### Bull Board - BullMQ Dashboard

http://localhost:3000/admin/queues/

### Database

#### Migrations

- change the schema in prisma/schema.prisma
- run `pnpm dev:db:migrate`
- add a descriptive name to the migration like `add_users` or `add_users_last_login_at`

#### Reset

```bash
pnpm dev:db:reset
```

### Testing

For running tests, we currently use the same docker infrastructure as for development.

Run all tests across the monorepo:

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch
```

Direct package testing:

```bash
# API tests only
pnpm -C apps/api test
pnpm -C apps/api test:watch
```

Run a single test:

```bash
pnpm -C apps/api test test/filename.test.ts
```

Wallaby.js is supported.

### Code Quality

**All code quality commands should be run from the root directory.** Tooling is configured at the root with per-package overrides for optimal consistency and performance:

```bash
# Linting (ESLint with TypeScript + React Native rules)
pnpm lint              # Check for linting issues across all packages
pnpm lint:fix          # Fix auto-fixable linting issues

# Formatting (Prettier)
pnpm format            # Format all code
pnpm format:check      # Check formatting without fixing

# Type checking (TypeScript with shared base config)
pnpm types             # Check TypeScript types across all packages

# Dependency analysis (Knip - monorepo-wide)
pnpm knip              # Check for unused dependencies across entire monorepo
pnpm knip:check        # Check without fixing
pnpm knip:fix          # Remove unused dependencies

# Database management
pnpm db:migrate add-users   # Run database migrations (pass migration name as argument)
pnpm db:create-dev-user     # Create development user for testing
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
