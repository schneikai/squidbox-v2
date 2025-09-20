#!/usr/bin/env bash
set -euo pipefail

# Fly.io one-shot deploy script for: redis (private), api (public), worker (private with volume)
# Always runs Prisma migrate deploy against DATABASE_URL before deploy.
# Usage:
#   JWT_SECRET=... \
#   DATABASE_URL=... \
#   FLY_REGION=fra \
#   REDIS_APP=squidbox-redis API_APP=squidbox-api WORKER_APP=squidbox-worker \
#   VOLUME_SIZE_GB=100 \
#   bash scripts/deploy-fly.sh
#   
#   For database reset (DANGER - ALL DATA LOST):
#   bash scripts/deploy-fly.sh --reset-db

REDIS_APP=${REDIS_APP:-squidbox-redis}
API_APP=${API_APP:-squidbox-api}
WORKER_APP=${WORKER_APP:-squidbox-worker}
REGION=${FLY_REGION:-fra}
REDIS_VOL_NAME=${REDIS_VOL_NAME:-redis_data}
WORKER_VOL_NAME=${WORKER_VOL_NAME:-data}
REDIS_VOL_SIZE=${REDIS_VOL_SIZE:-10}
WORKER_VOL_SIZE=${VOLUME_SIZE_GB:-100}

# Load env strictly from provided file or .env.production (no fallback to .env)
ENV_FILE=${ENV_FILE:-}
if [[ -z "$ENV_FILE" ]]; then
  if [[ -f .env.production ]]; then ENV_FILE=.env.production; fi
fi
if [[ -z "$ENV_FILE" || ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Provide ENV_FILE pointing to your production env or create .env.production" >&2
  echo "Required keys: JWT_SECRET, DATABASE_URL" >&2
  exit 1
fi
echo "[env] Loading ${ENV_FILE}"
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if ! command -v fly >/dev/null 2>&1; then
  echo "ERROR: flyctl not found. Install with: brew install flyctl" >&2
  exit 1
fi

if [[ -z "${JWT_SECRET:-}" ]]; then
  echo "ERROR: JWT_SECRET env var is required" >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL env var is required (use your Neon prod URL)" >&2
  exit 1
fi

echo "[fly] Using region=$REGION"

# Ask about database handling
echo ""
echo "🗄️  Database Migration Options:"
echo "   [Enter] Migrate (default) - Apply schema changes safely"
echo "   Type 'RESET' - WARNING: ALL DATA WILL BE LOST!"
echo ""
read -p "Choose option (default: migrate): " db_option

# Handle database option
if [[ "${db_option:-}" == "RESET" ]]; then
  echo "[migrate] Resetting database"
  npx prisma migrate reset --force
else
  echo "[migrate] Running Prisma migrate deploy against $DATABASE_URL"
  npx prisma migrate deploy
fi

# Create test user in production database
echo "[user] Creating test user in production database"
tsx scripts/create-dev-user.ts

echo "[redis] Creating app $REDIS_APP (if missing)"
fly apps create "$REDIS_APP" || true
echo "[redis] Creating volume $REDIS_VOL_NAME (${REDIS_VOL_SIZE}GB) in $REGION (if missing)"
fly volumes create "$REDIS_VOL_NAME" --app "$REDIS_APP" --region "$REGION" --size "$REDIS_VOL_SIZE" || true
echo "[redis] Deploying"
fly deploy -a "$REDIS_APP" -c "$(pwd)/fly.redis.toml"

REDIS_URL="redis://$REDIS_APP.internal:6379"

echo "[api] Creating app $API_APP (if missing)"
fly apps create "$API_APP" || true
echo "[api] Setting secrets"
fly secrets set -a "$API_APP" JWT_SECRET="$JWT_SECRET" DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL"
echo "[api] Deploying"
fly deploy -a "$API_APP" -c "$(pwd)/fly.api.toml"

echo "[worker] Creating app $WORKER_APP (if missing)"
fly apps create "$WORKER_APP" || true
echo "[worker] Creating volume $WORKER_VOL_NAME (${WORKER_VOL_SIZE}GB) in $REGION (if missing)"
fly volumes create "$WORKER_VOL_NAME" --app "$WORKER_APP" --region "$REGION" --size "$WORKER_VOL_SIZE" || true
echo "[worker] Setting secrets"
fly secrets set -a "$WORKER_APP" JWT_SECRET="$JWT_SECRET" DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL"
echo "[worker] Deploying"
fly deploy -a "$WORKER_APP" -c "$(pwd)/fly.worker.toml"

echo "[done] API URL:"
fly status -a "$API_APP" | sed -n 's/^[[:space:]]*Hostname[[:space:]]*=[[:space:]]*//p'

