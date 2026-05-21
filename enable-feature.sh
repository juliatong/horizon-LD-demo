#!/usr/bin/env python3

# ─────────────────────────────────────────────────────────
# enable-feature.sh (Python)
#
# Restores the feature flag to the correct state for
# the Part 2 targeting demo after kill-feature.sh has run.
#
# If an experiment is running, this script pauses and
# asks you to stop it manually in the LD dashboard first.
# This is because LD requires a justification comment
# to stop experiments via API - a dashboard-level policy.
# Once stopped, press Enter and the script handles the rest.
#
# Automated steps:
#   1. Detects if experiment is running (prompts if so)
#   2. Turns targeting back ON
#   3. Sets the default rule to serve false
#
# Usage:
#   chmod +x enable-feature.sh   (first time only)
#   export LD_API_TOKEN=your-api-access-token
#   export LD_ENV=your-environment-key (e.g. test)
#   ./enable-feature.sh
# ─────────────────────────────────────────────────────────

import os
import sys
import json
import urllib.request
import urllib.error

# ── Validate environment variables ────────────────────────

api_token = os.environ.get('LD_API_TOKEN')
env_key   = os.environ.get('LD_ENV')

if not api_token:
    print("ERROR: LD_API_TOKEN is not set.")
    print("Run: export LD_API_TOKEN=your-api-access-token")
    sys.exit(1)

if not env_key:
    print("ERROR: LD_ENV is not set.")
    print("Run: export LD_ENV=your-environment-key (e.g. test)")
    sys.exit(1)

FLAG_KEY       = 'new-hero-section'
PROJECT_KEY    = 'default'
EXPERIMENT_KEY = 'hero-section-a-b-test'
BASE_URL       = 'https://app.launchdarkly.com/api/v2'

SEMANT_HEADERS = {
    'Authorization': api_token,
    'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch',
}

def http_get(url):
    req = urllib.request.Request(url, headers={'Authorization': api_token})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR: HTTP {e.code} - {e.read().decode()}")
        sys.exit(1)

def http_patch(url, headers, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='PATCH')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR: HTTP {e.code} - {e.read().decode()}")
        sys.exit(1)

print(f"Restoring feature flag: {FLAG_KEY}...")
print("")

# ── Step 1: Check experiment status ───────────────────────

print("Step 1: Checking experiment status...")

experiment = http_get(
    f'{BASE_URL}/projects/{PROJECT_KEY}/environments/{env_key}/experiments/{EXPERIMENT_KEY}'
)
iteration_status = experiment.get('currentIteration', {}).get('status', 'not_started')

if iteration_status == 'running':
    print("")
    print("  ⚠️  Experiment is currently running.")
    print("  LD requires manual confirmation to stop experiment iterations.")
    print("")
    print("  Please do the following in the LD dashboard:")
    print("  1. Go to Experiments -> Hero Section A/B Test")
    print("  2. Click 'Stop'")
    print("  3. Select 'false' (Current Hero - Welcome) as the winning variation")
    print("  4. Confirm the stop")
    print("")
    input("  Press Enter when the experiment is stopped to continue...")
    print("")
else:
    print(f"  No running iteration (status: {iteration_status}). Continuing.")
    print("")

# ── Step 2: Fetch false variation ID ──────────────────────

flag_data = http_get(f'{BASE_URL}/flags/{PROJECT_KEY}/{FLAG_KEY}')

false_variation_id = None
for variation in flag_data.get('variations', []):
    if variation.get('value') == False:
        false_variation_id = variation.get('_id')
        break

if not false_variation_id:
    print("ERROR: Could not find false variation ID in flag.")
    sys.exit(1)

# ── Step 3: Turn targeting ON ──────────────────────────────

print("Step 2: Turning targeting ON...")

http_patch(
    f'{BASE_URL}/flags/{PROJECT_KEY}/{FLAG_KEY}',
    SEMANT_HEADERS,
    {
        'environmentKey': env_key,
        'instructions': [{ 'kind': 'turnFlagOn' }],
    }
)
print("  Done.")

# ── Step 4: Set default rule to serve false ────────────────

print("Step 3: Setting default rule to serve false...")

http_patch(
    f'{BASE_URL}/flags/{PROJECT_KEY}/{FLAG_KEY}',
    SEMANT_HEADERS,
    {
        'environmentKey': env_key,
        'instructions': [{
            'kind': 'updateFallthroughVariationOrRollout',
            'variationId': false_variation_id,
        }],
    }
)
print("  Done.")

# ── Summary ───────────────────────────────────────────────

print("")
print("✅ Flag restored:")
print("  Experiment:   stopped")
print("  Targeting:    ON")
print("  Default rule: false (untargeted users see old hero)")
print("")
print("Ready for Part 2 targeting demo.")
print("  qa-jane           -> true  (individual target)")
print("  enterprise + apac -> true  (Rule 1: account context)")
print("  beta + desktop    -> true  (Rule 2: cross-context)")
print("  everyone else     -> false (default fallthrough)")