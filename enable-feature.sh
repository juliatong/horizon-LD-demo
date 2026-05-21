#!/bin/bash

# ─────────────────────────────────────────────────────────
# enable-feature.sh
#
# Restores the feature flag after kill-feature.sh has run.
# Turns targeting back ON so the app evaluates targeting
# rules again.
#
# Use this after the incident response demo (Part 1 Act 3)
# to reset the flag for the targeting demo (Part 2).
#
# Usage:
#   chmod +x enable-feature.sh   (first time only)
#   ./enable-feature.sh
#
# REVIEWER: Set these two environment variables before running:
#   export LD_API_TOKEN=your-api-access-token
#   export LD_ENV=your-environment-key (e.g. test)
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

echo "Restoring feature: new-hero-section..."
echo ""

curl -s -X PATCH \
  'https://app.launchdarkly.com/api/v2/flags/default/new-hero-section' \
  -H "Authorization: ${LD_API_TOKEN}" \
  -H 'Content-Type: application/json; domain-model=launchdarkly.semanticpatch' \
  -d "{
    \"environmentKey\": \"${LD_ENV}\",
    \"instructions\": [{ \"kind\": \"turnFlagOn\" }]
  }"

echo ""
echo "Done. Feature restored. Targeting is ON."
echo "Default rule is now serving based on your targeting configuration."
echo "Reminder: confirm default rule is set to false before running Part 2 demo."
