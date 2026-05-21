#!/usr/bin/env python3

import os
import sys
import json
import urllib.request
import urllib.error

api_token = os.environ.get('LD_API_TOKEN')
env_key = os.environ.get('LD_ENV')

if not api_token or not env_key:
    print("ERROR: Set LD_API_TOKEN and LD_ENV first")
    sys.exit(1)

PROJECT_KEY    = 'default'
EXPERIMENT_KEY = 'hero-section-a-b-test'
FLAG_KEY       = 'new-hero-section'
BASE_URL       = 'https://app.launchdarkly.com/api/v2'

# Print top-level experiment keys (excluding currentIteration we already saw)
print("=== TOP LEVEL EXPERIMENT KEYS ===")
url = f'{BASE_URL}/projects/{PROJECT_KEY}/environments/{env_key}/experiments/{EXPERIMENT_KEY}'
req = urllib.request.Request(url, headers={'Authorization': api_token})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())
    for key in data.keys():
        if key != 'currentIteration':
            print(f"{key}: {json.dumps(data[key], indent=2)}")

# Print flag variation IDs
print("\n=== FLAG VARIATION IDs ===")
url = f'{BASE_URL}/flags/{PROJECT_KEY}/{FLAG_KEY}'
req = urllib.request.Request(url, headers={'Authorization': api_token})
with urllib.request.urlopen(req) as response:
    flag_data = json.loads(response.read())
    for v in flag_data.get('variations', []):
        print(f"value={v['value']}  _id={v['_id']}")