#!/usr/bin/env bash
# Creates or updates the alarms in Google Cloud, all e-mailed to ALERT_EMAIL. Safe to run again:
# what exists is updated, what is missing is created.
# - Error storm: more than 20 ERROR lines in five minutes. Each new kind of error is reported once
#   by Error Reporting, which reads the same lines; turn its notifications on in the console.
# - Heartbeats: one alarm per job in ops/gcp/heartbeats.json, when a job stops writing its
#   heartbeat line for longer than its window, which no error would ever say.
# - Uptime: /health checked every minute from three regions, when APP_URL is set.
# DRY_RUN=1 prints every gcloud command instead of running it.
#
#   GCP_PROJECT=my-project ALERT_EMAIL=team@example.com APP_URL=https://... pnpm gcp:alerts
set -euo pipefail

: "${GCP_PROJECT:?Set GCP_PROJECT to the Google Cloud project id}"
: "${ALERT_EMAIL:?Set ALERT_EMAIL to the address that receives the alarm}"

here="$(cd "$(dirname "$0")/.." && pwd)/ops/gcp"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

gcloud_run() {
  if [ "${DRY_RUN:-}" = "1" ]; then
    printf 'gcloud' >&2
    printf ' %q' "$@" >&2
    printf '\n' >&2
    echo "dry-run-$RANDOM"
  else
    gcloud "$@"
  fi
}
field() { node -e 'const v = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))[process.argv[2]]; process.stdout.write(String(v));' "$1" "$2"; }

log_metric() {
  local file="$1" name
  name="$(field "$file" name)"
  echo "Log-based metric ${name}"
  if gcloud_run logging metrics describe "$name" --project "$GCP_PROJECT" > /dev/null 2>&1 && [ "${DRY_RUN:-}" != "1" ]; then
    gcloud_run logging metrics update "$name" --project "$GCP_PROJECT" --config-from-file "$file" > /dev/null
  else
    gcloud_run logging metrics create "$name" --project "$GCP_PROJECT" --config-from-file "$file" > /dev/null
  fi
}

apply_policy() {
  local file="$1" display existing
  # A policy written here is checked before gcloud sees it, so a typo fails before anything changes.
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$file"
  display="$(field "$file" displayName)"
  echo "Alert policy: ${display}"
  existing="$(gcloud_run alpha monitoring policies list --project "$GCP_PROJECT" \
    --filter "displayName=\"${display}\"" --format "value(name)" | head -n 1)"
  if [ -n "$existing" ] && [ "${DRY_RUN:-}" != "1" ]; then
    gcloud_run alpha monitoring policies update "$existing" --project "$GCP_PROJECT" \
      --policy-from-file "$file" --set-notification-channels "$channel" > /dev/null
  else
    gcloud_run alpha monitoring policies create --project "$GCP_PROJECT" \
      --policy-from-file "$file" --notification-channels "$channel" > /dev/null
  fi
}

log_metric "$here/error-metric.json"
log_metric "$here/heartbeat-metric.json"

echo "Notification channel for ${ALERT_EMAIL}"
channel="$(gcloud_run beta monitoring channels list --project "$GCP_PROJECT" \
  --filter "type=\"email\" AND labels.email_address=\"${ALERT_EMAIL}\"" --format "value(name)" | head -n 1)"
if [ -z "$channel" ] || [ "${DRY_RUN:-}" = "1" ]; then
  channel="$(gcloud_run beta monitoring channels create --project "$GCP_PROJECT" \
    --display-name "App alerts" --type email \
    --channel-labels "email_address=${ALERT_EMAIL}" --format "value(name)")"
fi

apply_policy "$here/alert-policy.json"

# One policy per job. Missing data counts as a violation, so a job that stopped is caught even
# though its metric simply has no points; the window is at most 25 hours, which a daily job fits.
node -e 'for (const j of JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))) console.log(`${j.job} ${j.window} ${j.about}`);' "$here/heartbeats.json" |
  while read -r job window about; do
    cat > "$work/heartbeat-${job}.json" <<POLICY
{
  "displayName": "Job stopped: ${job}",
  "documentation": { "content": "No heartbeat from ${about} for ${window}. The scheduler may have stopped calling, or the job no longer finishes.", "mimeType": "text/markdown" },
  "combiner": "OR",
  "conditions": [{
    "displayName": "No heartbeat from ${job}",
    "conditionThreshold": {
      "filter": "metric.type=\"logging.googleapis.com/user/app_heartbeats\" AND resource.type=\"global\" AND metric.label.job=\"${job}\"",
      "comparison": "COMPARISON_LT",
      "thresholdValue": 1,
      "duration": "300s",
      "evaluationMissingData": "EVALUATION_MISSING_DATA_ACTIVE",
      "aggregations": [{ "alignmentPeriod": "${window}", "perSeriesAligner": "ALIGN_SUM" }]
    }
  }],
  "alertStrategy": { "autoClose": "86400s" }
}
POLICY
    apply_policy "$work/heartbeat-${job}.json"
  done

if [ -n "${APP_URL:-}" ]; then
  host="$(node -e 'process.stdout.write(new URL(process.argv[1]).host)' "$APP_URL")"
  echo "Uptime check for https://${host}/health"
  check="$(gcloud_run monitoring uptime list-configs --project "$GCP_PROJECT" \
    --filter "displayName=\"App health\"" --format "value(name)" | head -n 1)"
  if [ -z "$check" ] || [ "${DRY_RUN:-}" = "1" ]; then
    check="$(gcloud_run monitoring uptime create "App health" --project "$GCP_PROJECT" \
      --resource-type uptime-url --resource-labels "host=${host},project_id=${GCP_PROJECT}" \
      --protocol https --path /health --period 1 \
      --regions usa-virginia,europe,south-america --format "value(name)")"
  fi
  check_id="${check##*/}"
  cat > "$work/uptime.json" <<POLICY
{
  "displayName": "App down",
  "documentation": { "content": "/health failed from two or more regions. The app or its database is not answering.", "mimeType": "text/markdown" },
  "combiner": "OR",
  "conditions": [{
    "displayName": "Health check failing",
    "conditionThreshold": {
      "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${check_id}\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 1,
      "duration": "120s",
      "aggregations": [{
        "alignmentPeriod": "60s",
        "perSeriesAligner": "ALIGN_NEXT_OLDER",
        "crossSeriesReducer": "REDUCE_COUNT_FALSE",
        "groupByFields": ["resource.label.host"]
      }]
    }
  }],
  "alertStrategy": { "autoClose": "1800s" }
}
POLICY
  apply_policy "$work/uptime.json"
fi
echo "Done."
