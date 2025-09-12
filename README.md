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

One command (watches contracts, runs API + Expo):

```bash
pnpm dev
```

Direct package scripts (optional):

```bash
# Shared contracts (watch)
pnpm -F @squidbox/contracts dev

# API
pnpm -F squidboxservice dev

# Mobile
pnpm -F squidboxsocial dev
```

### Build

```bash
pnpm build
```

### Ports

- API: `http://localhost:3000`
- Worker: `http://localhost:3001`
- Expo Metro: `http://localhost:8081`

### Notes

- Contracts package builds to `dist` (ESM + CJS + d.ts). Expo is configured to consume workspace packages.
- Set `EXPO_PUBLIC_BACKEND_URL` for mobile (e.g. `http://localhost:3000`).
