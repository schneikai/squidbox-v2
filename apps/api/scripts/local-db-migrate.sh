#!/usr/bin/env bash
set -euo pipefail
NAME="${1:-init}"

[[ -f .env ]] || { echo "ERROR: .env not found" >&2; exit 1; }
set -a; source .env; set +a

: "${DATABASE_URL:?}"; : "${SHADOW_DATABASE_URL:?}"
: "${POSTGRES_USER:?}"; : "${POSTGRES_PASSWORD:?}"
: "${SHADOW_DB_NAME:?}"

# Ensure db is up
docker compose up -d db >/dev/null

# Wait for host-exposed port (5433)
until pg_isready -h localhost -p 5433 -U "$POSTGRES_USER" >/dev/null 2>&1; do
  echo "Waiting for Postgres on localhost:5433..."
  sleep 2
done

# Create shadow DB if missing
PGPASSWORD="$POSTGRES_PASSWORD" psql "host=localhost port=5433 user=$POSTGRES_USER dbname=postgres" -v ON_ERROR_STOP=1 -tc \
"SELECT 1 FROM pg_database WHERE datname='${SHADOW_DB_NAME}';" | grep -q 1 || \
PGPASSWORD="$POSTGRES_PASSWORD" psql "host=localhost port=5433 user=$POSTGRES_USER dbname=postgres" -v ON_ERROR_STOP=1 -c \
"CREATE DATABASE ${SHADOW_DB_NAME};"

# If you want to start fresh, you can run:
# npx prisma migrate reset

# Run prisma (uses host URLs from .env)
npx prisma migrate dev --name "$NAME"