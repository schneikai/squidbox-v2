#!/usr/bin/env bash
set -euo pipefail

# Check if migration name is provided
if [[ $# -eq 0 ]]; then
  echo "ERROR: Migration name is required" >&2
  echo "Usage: $0 <migration_name>" >&2
  echo "Example: $0 add_user_table" >&2
  exit 1
fi

NAME="$1"

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
# The shadow DB is a Prisma mechanism to test migrations first before applying them to the actual database
PGPASSWORD="$POSTGRES_PASSWORD" psql "host=localhost port=5433 user=$POSTGRES_USER dbname=postgres" -v ON_ERROR_STOP=1 -tc \
"SELECT 1 FROM pg_database WHERE datname='${SHADOW_DB_NAME}';" | grep -q 1 || \
PGPASSWORD="$POSTGRES_PASSWORD" psql "host=localhost port=5433 user=$POSTGRES_USER dbname=postgres" -v ON_ERROR_STOP=1 -c \
"CREATE DATABASE ${SHADOW_DB_NAME};"

# Run prisma (uses host URLs from .env)
npx prisma migrate dev --name "$NAME"