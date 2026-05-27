# Horizon Analytics - LaunchDarkly Feature Flag Demo

A React demo app showing feature flag-driven release, targeting, and experimentation using LaunchDarkly. Built for the LaunchDarkly SE technical exercise.

For the pitch narrative and stakeholder strategy, see [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).
For architectural decisions and SDK framework, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Prerequisites

- Node.js v20+ — run `node -v` to check, or `nvm use 20` if using nvm
- A LaunchDarkly trial account: [launchdarkly.com/start-trial](https://launchdarkly.com/start-trial)
- Python 3 (pre-installed on macOS) — required for `enable-feature.sh`
- ~5 minutes to set up

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/juliatong/horizon-ld-demo.git
cd horizon-ld-demo
npm install
```

### 2. Configure your SDK key

```bash
cp .env.example .env
```

Fill in your Client-side ID in `.env`:

```
VITE_LD_CLIENT_SIDE_ID=your-client-side-id-here
```

<!-- REVIEWER: Find your Client-side ID at:
     LD Dashboard -> Project Settings -> Environments -> your environment -> Client-side ID
     Must be the Client-side ID, NOT the server-side SDK key. -->

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## Flag Setup

### Create the feature flag

In your LaunchDarkly dashboard, create one flag:

| Setting | Value |
|---------|-------|
| Name | `new-hero-section` |
| Key | `new-hero-section` |
| Flag type | Boolean |
| Variation 1 (true) | `New Hero - AI Insights` |
| Variation 2 (false) | `Current Hero - Welcome` |

**Important:** Under the flag's **Settings** tab, enable **"Client-side SDK availability."** Without this the flag returns undefined and the app renders the safe default with a console warning.

### Configure targeting rules

Turn targeting **ON**. Configure in this order:

**Individual targets:**
- `true` variation -> add key `qa-jane`

**Rule 1 - Enterprise APAC accounts:**
- Context kind: `account` / Attribute: `plan` is one of `enterprise`
- AND Context kind: `account` / Attribute: `region` is one of `apac`
- Serve: `true`

**Rule 2 - Beta testers on desktop (cross-context rule):**
- Context kind: `user` / Attribute: `beta_tester` is one of `true`
- AND Context kind: `device` / Attribute: `type` is one of `desktop`
- Serve: `true`

**Default rule:** serve `false`

---

## Incident Response Scripts

Both scripts require environment variables set first:

```bash
export LD_API_TOKEN=your-api-access-token
export LD_ENV=test
```

<!-- REVIEWER: Create an API token at:
     LD Dashboard -> Account Settings -> Authorization -> Create token
     Role required: Writer or Admin -->

**Kill the feature (Part 1 Act 3 demo):**

```bash
chmod +x kill-feature.sh   # first time only
./kill-feature.sh
```

**Restore after kill (reset for Part 2):**

```bash
chmod +x enable-feature.sh   # first time only
./enable-feature.sh
```

`enable-feature.sh` requires Python 3. If an experiment is running, the script pauses and prompts you to stop it manually in the dashboard first (LD requires manual confirmation). Once stopped, press Enter and the script handles the rest automatically.

Post-restore verification: switch to Sam in the browser. He should see HeroOld (default rule false is working).

---

## Experiment Setup

### Create metrics

**Metric 1 (primary):**

| Setting | Value |
|---------|-------|
| Name | `CTA Click Rate` |
| Event key | `cta-clicked` |
| What to measure | Occurrence |
| Success criteria | Higher is better |

**Metric 2 (secondary):**

| Setting | Value |
|---------|-------|
| Name | `Trial Start Rate` |
| Event key | `trial-started` |
| What to measure | Occurrence |
| Success criteria | Higher is better |

### Create the experiment

| Setting | Value |
|---------|-------|
| Name | `Hero Section A/B Test` |
| Flag | `new-hero-section` |
| Targeting rule | Default Rule |
| Audience allocation | 100% |
| Variations split | 50% true / 50% false |
| Control | `false` |
| Statistical approach | Bayesian, 95% threshold |

**Note on audience:** Only Sam (free-tier NA user) falls through to the default rule and is included in the experiment. Jane, Akira, and Mei are pre-committed to a variation via targeting rules and are excluded. This is intentional — see [ARCHITECTURE.md](./ARCHITECTURE.md) for the rationale.

**Note on variation assignment:** Sam's variation is hash-determined. He consistently lands in one bucket but you cannot predict which one in advance. Either variation is correct experiment behaviour.

---

## Demo State Guide

| Demo part | Before action | After action | Experiment |
|-----------|--------------|--------------|------------|
| Setup (before demo starts) | — | Flag OFF, default rule=true, off variation=false, no rules | Stopped |
| Part 1 Act 1 (release) | Flag OFF | Flag ON, everyone sees HeroNew | Stopped |
| Part 1 Act 2 (rollback) | Flag ON | Flag OFF, everyone sees HeroOld | Stopped |
| Part 1 Act 3 (kill switch) | Flag OFF -> toggle ON first, then run script | Flag OFF via kill script, everyone sees HeroOld | Stopped |
| Transition (add targeting rules) | Flag OFF, no rules | Rules added, default rule=false, flag still OFF | Stopped |
| Part 2 (targeting demo) | Flag OFF, rules configured | Flag ON, switch personas | Stopped |
| Experimentation | Flag ON, default rule=false | No change | Running |

**Transition between Part 1 and Part 2 (add targeting rules):**
1. Flag is currently OFF after the kill switch
2. In the LD dashboard, add targeting rules while flag is still OFF:
   - Individual target: `qa-jane` -> true
   - Rule 1: account.plan = enterprise AND account.region = apac -> true
   - Rule 2: user.beta_tester = true AND device.type = desktop -> true
   - Default rule: false
3. Do not toggle the flag ON yet — that happens when Part 2 demo starts

**Starting Part 2 (targeting demo):**
1. Toggle the flag ON in the dashboard
2. Switch personas and observe targeting rules evaluating:
   - Jane -> HeroNew (individual target)
   - Akira -> HeroNew (Rule 1: enterprise + apac)
   - Sam -> HeroOld (default fallthrough)
   - Mei -> HeroNew (Rule 2: beta_tester + desktop)

**Reset for experimentation demo:**
1. Flag is already ON, default rule is false — no flag changes needed
2. Start the experiment iteration in the dashboard
3. Switch to Sam and generate CTA clicks on both hero variations

---

## Project Structure

```
horizon-ld-demo/
|-- .env.example                # Template - copy to .env and fill in values
|-- .nvmrc                      # Node version pin: 20
|-- index.html                  # App title: Horizon Analytics
|-- kill-feature.sh             # Kills feature via REST API (bash)
|-- enable-feature.sh           # Restores flag + stops experiment (Python 3)
|-- package.json                # engines: node >=20.0.0
|-- src/
|   |-- constants.js            # Single source of truth for DEFAULT_FLAGS
|   |-- main.jsx                # LD provider init: multi-context, timeout, catch
|   |-- App.jsx                 # Flag undefined guard, hero routing
|   |-- HeroOld.jsx             # Current hero (flag OFF) - tracks CTA events
|   |-- HeroNew.jsx             # New hero (flag ON) - tracks CTA events
|   |-- PersonaSwitcher.jsx     # Multi-context switch: loading state, try/catch
|   `-- index.css               # Minimal global reset
|-- DEMO_SCRIPT.md              # Pitch narrative, stakeholder strategy, Q&A
|-- ARCHITECTURE.md             # SDK decisions, context model, technical depth
`-- README.md                   # This file - setup and operations
```

---

## Environment & Assumptions

- Node.js v20+ required (`.nvmrc` pins to 20)
- Tested on macOS with Chrome
- Vite v8 dev server
- LaunchDarkly React SDK: `launchdarkly-react-client-sdk`
- No backend required — everything runs client-side
- `.env` is gitignored — reviewer creates their own from `.env.example`

---

## SDK & Flag Reference

| Item | Value |
|------|-------|
| SDK | `launchdarkly-react-client-sdk` |
| Flag key | `new-hero-section` |
| Flag type | Boolean |
| Context kinds | `user`, `account`, `device` |
| Metric event keys | `cta-clicked` (primary), `trial-started` (secondary) |
| SDK initialization timeout | 5 seconds |
| SDK key type | Client-side ID (not server-side SDK key) |
| SDK key location | `.env` -> `VITE_LD_CLIENT_SIDE_ID` |
