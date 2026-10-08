#!/usr/bin/env bash
# Creates or updates the error alarm in Google Cloud: a log-based metric for entries with severity
# ERROR and an alert policy that e-mails ALERT_EMAIL when the metric rises. Safe to run again: what
# exists is updated, what is missing is created.
#
#   GCP_PROJECT=my-project ALERT_EMAIL=team@example.com pnpm gcp:alerts
set -euo pipefail

: "${GCP_PROJECT:?Set GCP_PROJECT to the Google Cloud project id}"
: "${ALERT_EMAIL:?Set ALERT_EMAIL to the address that receives the alarm}"

here="$(cd "$(dirname "$0")/.." && pwd)/ops/gcp"
metric="$(sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' "$here/error-metric.json" | head -n 1)"
description="$(sed -n 's/.*"description": *"\([^"]*\)".*/\1/p' "$here/error-metric.json" | head -n 1)"
filter="$(sed -n 's/.*"filter": *"\(.*\)".*/\1/p' "$here/error-metric.json" | head -n 1 | sed 's/\\"/"/g')"

echo "Log-based metric ${metric}"
if gcloud logging metrics describe "$metric" --project "$GCP_PROJECT" > /dev/null 2>&1; then
  gcloud logging metrics update "$metric" --project "$GCP_PROJECT" \
    --description "$description" --log-filter "$filter"
else
  gcloud logging metrics create "$metric" --project "$GCP_PROJECT" \
    --description "$description" --log-filter "$filter"
fi

echo "Notification channel for ${ALERT_EMAIL}"
channel="$(gcloud beta monitoring channels list --project "$GCP_PROJECT" \
  --filter "type=email AND labels.email_address=${ALERT_EMAIL}" --format "value(name)" | head -n 1)"
if [ -z "$channel" ]; then
  channel="$(gcloud beta monitoring channels create --project "$GCP_PROJECT" \
    --display-name "App alerts" --type email \
    --channel-labels "email_address=${ALERT_EMAIL}" --format "value(name)")"
fi

echo "Alert policy"
policy_name="$(sed -n 's/.*"displayName": *"\(App errors\)".*/\1/p' "$here/alert-policy.json" | head -n 1)"
existing="$(gcloud alpha monitoring policies list --project "$GCP_PROJECT" \
  --filter "displayName=\"${policy_name}\"" --format "value(name)" | head -n 1)"
if [ -n "$existing" ]; then
  gcloud alpha monitoring policies update "$existing" --project "$GCP_PROJECT" \
    --policy-from-file "$here/alert-policy.json" --notification-channels "$channel"
else
  gcloud alpha monitoring policies create --project "$GCP_PROJECT" \
    --policy-from-file "$here/alert-policy.json" --notification-channels "$channel"
fi
echo "Done."
