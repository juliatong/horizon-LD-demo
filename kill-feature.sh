#!/bin/bash

# ─────────────────────────────────────────────────────────
# kill-feature.sh
#
# Simulates what a LaunchDarkly trigger does automatically.
#
# In production, this call is made by PagerDuty, Datadog, or
# any monitoring tool via a pre-configured webhook URL.
# No human required - the alert fires, the feature dies.
#
# LaunchDarkly triggers (Enterprise) would replace this entire
# script with a single pre-baked URL:
#   curl -X POST <trigger-url>
# No auth headers. No payload. One line wired into your
# monitoring tool of choice.
#
# This script achieves the same outcome via the REST API,
# demonstrating the same incident-response pattern on a trial account.
#
# Usage:
#   chmod +x kill-feature.sh   (first time only)
#   ./kill-feature.sh
#
# REVIEWER: Set these two environment variables before running:
#   export LD_API_TOKEN=your-api-access-token
#   export LD_ENV=your-environment-key (e.g. "test" or "production")
#
# Create an API token at:
#   LD Dashboard -> Account Settings -> Authorization -> Create token
#   Role required: Writer or Admin
# ─────────────────────────────────────────────────────────

# Validate required environment variables
if [ -z "$LD_API_TOKEN" ]; then
  echo "ERROR: LD_API_TOKEN is not set."
  echo "Run: export LD_API_TOKEN=your-api-access-token"
  exit 1
fi

if [ -z "$LD_ENV" ]; then
  echo "ERROR: LD_ENV is not set."
  echo "Run: export LD_ENV=your-environment-key (e.g. test)"
  exit 1
fi

echo "Incident detected. Disabling feature: new-hero-section..."
echo ""

curl -s -X PATCH \
  'https://app.launchdarkly.com/api/v2/flags/default/new-hero-section' \
  -H "Authorization: ${LD_API_TOKEN}" \
  -H 'Content-Type: application/json; domain-model=launchdarkly.semanticpatch' \
  -d "{
    \"environmentKey\": \"${LD_ENV}\",
    \"instructions\": [{ \"kind\": \"turnFlagOff\" }]
  }"

echo ""
echo "Done. Feature disabled. Incident contained."
echo "No dashboard. No deploy. No human in the loop."