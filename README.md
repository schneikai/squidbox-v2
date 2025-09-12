## Squidbox v2 Monorepo

Shared TypeScript monorepo with:

- `apps/api` — Express backend (dev on 3000), background worker (3001)
- `apps/mobile` — Expo app (Metro on 8081)
- `packages/contracts` — shared types and Zod schemas

### Requirements

- Node `20.17.0` (`.nvmrc`)
- pnpm (managed via Corepack)

### Install

```bash
nvm use
corepack enable
corepack prepare pnpm@9.12.3 --activate || npm i -g pnpm@9.12.3
pnpm i
```

### Development

```bash
# First-time setup: Initialize database and create dev user
pnpm db:migrate init
pnpm db:create-dev-user

# Start all services
pnpm dev
```

### Build

```bash
pnpm build
```

### Testing

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
