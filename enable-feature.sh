#!/usr/bin/env python3

# ─────────────────────────────────────────────────────────
# enable-feature.sh (Python)
#
# Restores the feature flag to the correct state for
# the Part 2 targeting demo after kill-feature.sh has run.
#
# Two operations in sequence:
#   1. Turns targeting back ON
#   2. Sets the default rule to serve false
#
# Why both? kill-feature.sh turns targeting OFF entirely.
# Turning targeting ON without resetting the default rule
# leaves the flag in an unpredictable state. This script
# restores the correct demo state in one command:
#   targeting ON, default rule false,
#   targeting rules evaluate normally.
#
# Usage:
#   chmod +x enable-feature.sh   (first time only)
#   export LD_API_TOKEN=your-api-access-token
#   export LD_ENV=your-environment-key (e.g. test)
#   ./enable-feature.sh
#
# REVIEWER: Create an API token at:
#   LD Dashboard -> Account Settings -> Authorization -> Create token
#   Role required: Writer or Admin
# ─────────────────────────────────────────────────────────

import os
import sys
import json
import urllib.request
import urllib.error

# ── Validate environment variables ────────────────────────

api_token = os.environ.get('LD_API_TOKEN')
env_key = os.environ.get('LD_ENV')

if not api_token:
    print("ERROR: LD_API_TOKEN is not set.")
    print("Run: export LD_API_TOKEN=your-api-access-token")
    sys.exit(1)

if not env_key:
    print("ERROR: LD_ENV is not set.")
    print("Run: export LD_ENV=your-environment-key (e.g. test)")
    sys.exit(1)

FLAG_KEY = 'new-hero-section'
PROJECT_KEY = 'default'
BASE_URL = 'https://app.launchdarkly.com/api/v2'

HEADERS = {
    'Authorization': api_token,
    'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch',
}

def patch_flag(instructions):
    url = f'{BASE_URL}/flags/{PROJECT_KEY}/{FLAG_KEY}'
    payload = json.dumps({
        'environmentKey': env_key,
        'instructions': instructions,
    }).encode('utf-8')

    req = urllib.request.Request(url, data=payload, headers=HEADERS, method='PATCH')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR: HTTP {e.code} - {e.read().decode()}")
        sys.exit(1)

def get_flag():
    url = f'{BASE_URL}/flags/{PROJECT_KEY}/{FLAG_KEY}'
    req = urllib.request.Request(url, headers={'Authorization': api_token})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR: HTTP {e.code} - {e.read().decode()}")
        sys.exit(1)

# ── Step 1: Turn targeting ON ──────────────────────────────

print(f"Restoring feature flag: {FLAG_KEY}...")
print("Step 1: Turning targeting ON...")

patch_flag([{ 'kind': 'turnFlagOn' }])
print("  Done.")

# ── Step 2: Set default rule to serve false ────────────────

print("Step 2: Setting default rule to serve false...")

# Fetch flag to find the variation ID for false
flag_data = get_flag()
variations = flag_data.get('variations', [])

false_variation_id = None
for variation in variations:
    if variation.get('value') == False:
        false_variation_id = variation.get('_id')
        break

if not false_variation_id:
    print("ERROR: Could not find false variation ID.")
    print("Please manually set the default rule to false in the LD dashboard.")
    sys.exit(1)

patch_flag([{
    'kind': 'updateFallthroughVariationOrRollout',
    'variationId': false_variation_id,
}])

print("  Done.")
print("")
print("Flag restored:")
print("  Targeting:    ON")
print("  Default rule: false (safe default - untargeted users see old hero)")
print("")
print("Ready for Part 2 targeting demo.")
