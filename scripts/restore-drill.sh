#!/usr/bin/env bash
# The backup drill. Restores a dump into a throwaway Postgres, applies the migrations it lacks and
# counts every table; fails when the copy comes back without users. Accepts the custom format of
# pg_dump (what Coolify's scheduled backup writes) and plain SQL, gzipped or not. Run it once a
# month against the latest backup; nothing it starts survives it.
#
#   pnpm restore:drill path/to/backup.dmp
set -euo pipefail

dump="${1:?Pass the backup file}"
name="restore-drill-$$"
port=5499

cleanup() { docker rm -f "$name" > /dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$name" -p "${port}:5432" -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app \
  -e POSTGRES_DB=app postgres:17-alpine > /dev/null
until docker exec "$name" pg_isready -U app -d app > /dev/null 2>&1; do sleep 1; done

echo "== Restoring $dump"
case "$dump" in
  *.sql.gz) gunzip -c "$dump" | docker exec -i "$name" psql -q -v ON_ERROR_STOP=1 -U app -d app ;;
  *.sql) docker exec -i "$name" psql -q -v ON_ERROR_STOP=1 -U app -d app < "$dump" ;;
  *) docker exec -i "$name" pg_restore --no-owner --no-privileges -U app -d app < "$dump" ;;
esac

echo "== Migrations and counts"
pnpm exec tsx --conditions=react-server scripts/restore-check.mts "postgres://app:app@localhost:${port}/app"
echo "Restored."
