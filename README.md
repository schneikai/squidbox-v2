## Squidbox v2 Monorepo

Shared TypeScript monorepo with:

- `apps/api` — Express backend (dev on 3000), background worker (3001)
- `apps/mobile` — Expo app (Metro on 8081)
- `packages/contracts` — shared types and Zod schemas

### Requirements

- Node `20.17.0` (`.nvmrc`)
- pnpm (managed via Corepack)

### Setup

```bash
nvm use
corepack enable
corepack prepare pnpm@9.12.3 --activate || npm i -g pnpm@9.12.3
pnpm i

# Start docker services and create database
pnpm dev:setup
```

### Development

```bash
pnpm dev
```

### Database migrations

- change the schema in prisma/schema.prisma
- run `pnpm dev:db:migrate`
- add a descriptive name to the migration like `add_users` or `add_users_last_login_at`

<!-- Heads-up: The `pnpm db:reset` command was added while in active development without a need to
maintain migrations. When you have deployed a production database and the data there is
important, you must switch to the `pnpm db:migrate` command!

The following commad are all for development database management. The production database is managed
via the deploy script `pnpm deploy`.

```bash
# Create the development database with the default test user
pnpm db:create

# Drop and recreate the development database with the default test user
# This is meant to be used in active development while you dont need to maintain migrations
# This will overwrite all existig migrations with a single migration reflecting the current schema
pnpm db:reset

# Run a database migration
# The workflow is the following:
# 1. Make changes to the schema in prisma/schema.prisma
# 2. Run pnpm db:migrate <migration_name>
# Where <migration_name> is a descriptive name for the migration
# Example: pnpm db:migrate add_users
#          pnpm db:migrate add_username_to_users
pnpm db:migrate
``` -->

### Testing

we are using testcontainers for postgres and redis. You need to have docker installed on your local machine. If you get a authentication error, you need run `docker login` and complete the process. then run pnpm test again.

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

**Configuration:**

- **Root configs**: `eslint.config.mjs`, `tsconfig.base.json`, `knip.json`
- **Package overrides**: Each package extends root config with environment-specific settings
- **Shared dependencies**: All dev tools installed at root for faster CI and consistency

**Note:** Individual app packages no longer have their own code quality scripts. Always run these commands from the monorepo root for proper configuration and cross-package analysis.

### Ports

- API: `http://localhost:3000`
- Worker: `http://localhost:3001`
- Expo Metro: `http://localhost:8081`

### Development User

The dev user script uses the same environment variables as the mobile app:

- `EXPO_PUBLIC_DEV_USER_EMAIL` (defaults to `dev@example.com`)
- `EXPO_PUBLIC_DEV_USER_PASSWORD` (defaults to `devpassword123`)

For custom credentials:

```bash
EXPO_PUBLIC_DEV_USER_EMAIL=myuser@test.com EXPO_PUBLIC_DEV_USER_PASSWORD=mypass123 pnpm db:create-dev-user
```

### Notes

- Contracts package builds to `dist` (ESM + CJS + d.ts). Expo is configured to consume workspace packages.
- Set `EXPO_PUBLIC_BACKEND_URL` for mobile (e.g. `http://localhost:3000`).
