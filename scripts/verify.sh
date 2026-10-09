#!/usr/bin/env bash
# The full proof before a phase is delivered, with no CI: the checks, the rules against a real
# Postgres, the production image booting against a throwaway database, and the browser suite
# against a clean compose built from a copy of the working tree. Everything it starts is removed
# when it ends, even on failure. The local compose must be down, because the clean one takes its
# ports.
#
#   pnpm verify
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
name="$(basename "$repo" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')-verify"
copy="$(mktemp -d)"
image_port=47399

cleanup() {
  docker rm -f "${name}-app" "${name}-db" > /dev/null 2>&1 || true
  docker network rm "${name}-net" > /dev/null 2>&1 || true
  if [ -f "$copy/docker-compose.yml" ]; then
    (cd "$copy" && docker compose -p "$name" down -v > /dev/null 2>&1) || true
  fi
  rm -rf "$copy"
}
trap cleanup EXIT

wait_for() {
  local url="$1" seconds="$2"
  for _ in $(seq "$seconds"); do
    if curl -fsS "$url" > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

for port in 47300 47440 47030 "$image_port"; do
  if lsof -iTCP:"$port" -sTCP:LISTEN > /dev/null 2>&1; then
    echo "Port $port is in use. Stop the local compose (docker compose down) and try again." >&2
    exit 1
  fi
done

cd "$repo"
# A file in public/ that the proxy could swallow: the proxy matcher names the extensions it skips,
# so a type it does not name (audio, JSON) is the one worth proving reaches the browser.
probe_files=("public/verify-probe.wav" "public/verify-probe.json")
printf 'RIFF' > "${probe_files[0]}"
printf '{ "probe": true }\n' > "${probe_files[1]}"
trap 'rm -f "${probe_files[@]}"; cleanup' EXIT
echo "== Checks"
pnpm check
echo "== Integration"
pnpm test:integration

echo "== Production image"
docker build -t "${name}:local" .
docker network create "${name}-net" > /dev/null
docker run -d --name "${name}-db" --network "${name}-net" \
  -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app postgres:17-alpine > /dev/null
until docker exec "${name}-db" pg_isready -U app -d app > /dev/null 2>&1; do sleep 1; done
secret="$(openssl rand -hex 32)"
docker run -d --name "${name}-app" --network "${name}-net" -p "${image_port}:3000" \
  -e APP_URL="http://localhost:${image_port}" \
  -e DATABASE_URL="postgres://app:app@${name}-db:5432/app" \
  -e AUTH_PROVIDER=local -e BETTER_AUTH_SECRET="$secret" -e FILE_URL_SECRET="$secret" \
  -e CRON_SECRET="$secret" -e EMAIL_FROM="verify@example.com" \
  "${name}:local" > /dev/null
if ! wait_for "http://localhost:${image_port}/health" 90; then
  docker logs "${name}-app" >&2
  exit 1
fi
curl -fsS "http://localhost:${image_port}/" > /dev/null
# What only production shows: a prerendered page resumed through the proxy, and metadata built
# with the address the container runs at, not the one the image was built with.
page="$(curl -fsS "http://localhost:${image_port}/termos")"
if ! grep -q "<link rel=\"canonical\" href=\"http://localhost:${image_port}/termos\"" <<< "$page"; then
  echo "The public page does not carry the runtime address in its canonical." >&2
  exit 1
fi
missing="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${image_port}/artigos/nao-existe")"
if [ "$missing" != "404" ]; then
  echo "A missing dynamic page answered $missing instead of 404." >&2
  exit 1
fi
moved="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "http://localhost:${image_port}/terms")"
if [ "$moved" != "301 http://localhost:${image_port}/termos" ]; then
  echo "The route address did not move to the public one: $moved" >&2
  exit 1
fi
for probe in verify-probe.wav verify-probe.json; do
  served="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "http://localhost:${image_port}/${probe}")"
  if [ "$served" != "200 " ]; then
    echo "A file in public/ did not reach the browser: ${probe} answered ${served}." >&2
    exit 1
  fi
done
docker rm -f "${name}-app" "${name}-db" > /dev/null
docker network rm "${name}-net" > /dev/null
docker image rm "${name}:local" > /dev/null

echo "== Browser suite on a clean compose"
git ls-files -z --cached --others --exclude-standard | tar --null -T - -cf - | tar -xf - -C "$copy"
(cd "$copy" && docker compose -p "$name" up -d)
wait_for "http://localhost:47300/health" 600
if ! pnpm test:e2e; then
  # The clean compose is removed when this ends, so what the server said has to be shown now.
  echo "== The app's last lines in the clean compose" >&2
  (cd "$copy" && docker compose -p "$name" ps -a >&2 && docker compose -p "$name" logs app --tail 150 >&2) || true
  exit 1
fi

echo "Verified."
