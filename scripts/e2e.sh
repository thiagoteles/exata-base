#!/usr/bin/env bash
# The browser suite against the production build, as Next's testing guide recommends: the
# development server compiles every route the suite visits and keeps it, and with all of them it
# reaches its own memory limit and restarts in the middle of a spec. The compose's app is swapped
# for the production image on the same ports and database, and swapped back when the suite ends;
# if no app was running, the production one is removed instead.
#
#   pnpm test:e2e [playwright arguments]
#
# E2E_DIR and E2E_PROJECT point it at another checkout's compose (the clean copy `pnpm verify`
# makes); by default it is this repository's own.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
dir="${E2E_DIR:-$repo}"
project="${E2E_PROJECT:-$(basename "$dir" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')}"
export E2E_IMAGE="${project}-production:local"
app_port="$(node -p "require('$repo/ports.json').app")"

development() { docker compose --project-directory "$dir" -p "$project" -f "$dir/docker-compose.yml" "$@"; }
production() {
  docker compose --project-directory "$dir" -p "$project" \
    -f "$dir/docker-compose.yml" -f "$dir/docker-compose.e2e.yml" "$@"
}

was_running="$(development ps --status running --services 2> /dev/null | grep -qx app && echo yes || echo no)"

restore() {
  if [ "$was_running" = yes ]; then
    echo "== Back to the development server"
    development up -d app > /dev/null 2>&1 || echo "Could not bring the development app back." >&2
  else
    production rm -sf app > /dev/null 2>&1 || true
  fi
}
trap restore EXIT

echo "== Production image"
production build app
production up -d --force-recreate app
for _ in $(seq 120); do
  if curl -fsS "http://localhost:${app_port}/health" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "http://localhost:${app_port}/health" > /dev/null

echo "== Browser suite"
if ! (cd "$repo" && pnpm exec playwright test "$@"); then
  echo "== The app's last lines" >&2
  production logs app --tail 150 >&2 || true
  exit 1
fi
