#!/usr/bin/env bash
# After a restore: sends the former ids of accounts deleted since the backup to the running app,
# which deletes each again with its real steps. The ids come from the failed database's
# account_deletions, or from the "account deleted" lines of the log; one per line.
#
#   APP_URL=https://... CRON_SECRET=... pnpm restore:reapply ids.txt
set -euo pipefail

file="${1:?Pass the file with one former user id per line}"
: "${APP_URL:?Set APP_URL to the address of the app running on the restored database}"
: "${CRON_SECRET:?Set CRON_SECRET to the secret the app runs with}"

curl -fsS -X POST --data-binary "@${file}" -H "content-type: text/plain" \
  -H "authorization: Bearer ${CRON_SECRET}" "${APP_URL%/}/api/operations/reapply-deletions"
echo
