#!/usr/bin/env bash
# Keeps the access records the Marco Civil asks for (art. 15) apart from the app log: a bucket of
# its own holding them for 183 days, a sink sending the "access" log there, and that log left out
# of the default bucket, so it is neither kept longer nor read alongside the app log. Run it once
# per project of a product with ACCESS_LOG=on. Safe to run again. DRY_RUN=1 prints the commands.
#
#   GCP_PROJECT=my-project pnpm gcp:access-log
set -euo pipefail

: "${GCP_PROJECT:?Set GCP_PROJECT to the Google Cloud project id}"

bucket="access-logs"
retention_days=183
filter="logName=\"projects/${GCP_PROJECT}/logs/access\""
destination="logging.googleapis.com/projects/${GCP_PROJECT}/locations/global/buckets/${bucket}"

gcloud_run() {
  if [ "${DRY_RUN:-}" = "1" ]; then
    printf 'gcloud' >&2
    printf ' %q' "$@" >&2
    printf '\n' >&2
  else
    gcloud "$@"
  fi
}
exists() { [ "${DRY_RUN:-}" != "1" ] && gcloud "$@" > /dev/null 2>&1; }

echo "Bucket ${bucket}, ${retention_days} days"
if exists logging buckets describe "$bucket" --location global --project "$GCP_PROJECT"; then
  gcloud_run logging buckets update "$bucket" --location global --project "$GCP_PROJECT" \
    --retention-days "$retention_days"
else
  gcloud_run logging buckets create "$bucket" --location global --project "$GCP_PROJECT" \
    --retention-days "$retention_days" --description "Access records kept under the Marco Civil"
fi

echo "Sink for the access log"
if exists logging sinks describe "$bucket" --project "$GCP_PROJECT"; then
  gcloud_run logging sinks update "$bucket" "$destination" --project "$GCP_PROJECT" --log-filter "$filter"
else
  gcloud_run logging sinks create "$bucket" "$destination" --project "$GCP_PROJECT" --log-filter "$filter"
fi

echo "Access log left out of the default bucket"
gcloud_run logging sinks update _Default --project "$GCP_PROJECT" \
  --add-exclusion "name=access-records,filter=${filter}" || true
echo "Done."
