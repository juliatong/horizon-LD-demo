# Horizon Analytics — LaunchDarkly Feature Flag Demo

## The Problem

Your company ships code every two weeks, but releasing features is a different story. Deploys take 45 minutes. Rollbacks take longer. Last quarter, a broken feature made it to production on a Friday afternoon — it took three hours and two engineers to revert. Leadership is pushing to ship faster, but not at the cost of stability.

LaunchDarkly decouples **deployment** from **release**. Code ships when it's ready. Features go live when *you* decide — and come back down in milliseconds if anything goes wrong.

This demo shows how, using a realistic SaaS landing page for a fictional company called Horizon Analytics.

---

## What This Demo Shows

### Part 1: Release & Remediate

A single boolean feature flag (`new-hero-section`) controls a redesigned hero section. With this flag, you can:

- **Release instantly** — toggle the flag ON in the LaunchDarkly dashboard. The UI updates in real-time with zero page reload, powered by LaunchDarkly's streaming SSE connection.
- **Roll back instantly** — toggle the flag OFF. The old experience returns in under a second. No rollback deploy, no CI pipeline, no downtime.
- **Remediate via automation** — a single `curl` command turns off the flag remotely, simulating what PagerDuty, Datadog, or any incident response tool would do via webhook. The feature dies without a human touching the dashboard.

### Part 2: Target

The same flag, now with precision. Instead of all-or-nothing, targeting rules control exactly who sees the new experience:

- **Individual targeting** — QA engineer `qa-jane` is individually targeted and always sees the feature, regardless of rules.
- **Rule: Premium APAC users** — users with `user_tier = premium` AND `region = apac` get the feature. High-value segment, controlled rollout.
- **Rule: Beta testers** — users with `beta_tester = true` get early access.
- **Default fallthrough** — everyone else sees the current experience. The safety net.

A **persona switcher** in the bottom-right corner lets you switch between four demo users and watch the UI update instantly as LaunchDarkly evaluates each user's context against the targeting rules.

### Extra Credit: Experimentation

The Product Manager needs data to justify the new hero section. Opinions aren't enough — did the redesign actually drive more engagement? LaunchDarkly Experimentation answers this by running an A/B test directly on the feature flag:

- **Metric** — a custom `cta-clicked` event fires when any user clicks the CTA button on either hero variation.
- **Experiment** — a 50/50 split on the default rule measures CTA click-through rate across the old hero (control) vs. the new hero (treatment).
- **Result** — the experiment results UI shows conversions, exposures, and statistical analysis. With sufficient traffic, this gives the PM a data-driven answer.

---

## Quick Start

### Prerequisites

- Node.js v20+ (run `node -v` to check)
- A LaunchDarkly trial account ([sign up here](https://launchdarkly.com/start-trial))
- ~5 minutes

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/horizon-ld-demo.git
cd horizon-ld-demo
npm install
```

### 2. Create the feature flag in your LaunchDarkly account

Go to your LaunchDarkly dashboard and create one flag:

| Setting | Value |
|---------|-------|
| Name | `new-hero-section` |
| Key | `new-hero-section` |
| Flag type | Boolean |
| Variation 1 | `true` |
| Variation 2 | `false` |

**Important:** Under the flag's **Settings** tab, ensure **"Client-side SDK availability"** is checked. The React SDK requires this.

### 3. Configure your SDK key

Create a `.env` file in the project root:

```
VITE_LD_CLIENT_SIDE_ID=your-client-side-id-here
```

<!-- REVIEWER: Replace with your Client-side ID.
     Find it at: LaunchDarkly Dashboard → Project Settings → Environments → your environment → Client-side ID -->

### 4. Run the app

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Demo Walkthrough

### Part 1: Release & Remediate

**Setup:** Turn targeting ON. Set the default rule to serve `false`. All users see the old hero.

**Act 1 — The safe release:**
1. Open the app in your browser — you see "Welcome to Horizon Analytics" (old hero)
2. In the LD dashboard, change the default rule to serve `true`
3. Watch the browser — the hero swaps to "Introducing Horizon AI Insights" instantly. No page reload.

**Act 2 — The instant rollback:**
1. In the LD dashboard, change the default rule back to `false`
2. The old hero returns instantly

**Act 3 — Incident response (the curl kill switch):**
1. Set the default rule back to `true` (feature is live)
2. Open a terminal and run:

```bash
curl -X PATCH \
  'https://app.launchdarkly.com/api/v2/flags/default/new-hero-section' \
  -H 'Authorization: YOUR_API_TOKEN' \
  -H 'Content-Type: application/json; domain-model=launchdarkly.semanticpatch' \
  -d '{
    "environmentKey": "YOUR_ENVIRONMENT_KEY",
    "instructions": [{ "kind": "turnFlagOff" }]
  }'
```

<!-- REVIEWER: Replace YOUR_API_TOKEN with an API access token (create one at Account Settings → Authorization).
     Replace YOUR_ENVIRONMENT_KEY with your environment key (e.g., "test" or "production"). -->

3. Watch the browser — the feature dies without touching the dashboard. This is what automated incident response looks like: PagerDuty fires, webhook hits LaunchDarkly, broken feature is off in seconds.

### Part 2: Target

**Setup:** Turn targeting back ON. Configure these targeting rules:

**Individual targets:**
- `true` variation → add `qa-jane`

**Rule 1 — Premium APAC users:**
- Context kind: `user`
- Attribute: `region` is one of `apac`
- AND Attribute: `user_tier` is one of `premium`
- Serve: `true`

**Rule 2 — Beta testers:**
- Context kind: `user`
- Attribute: `beta_tester` is one of `true`
- Serve: `true`

**Default rule:** serve `false`

**Testing with the persona switcher:**

Click each persona in the bottom-right panel and observe:

| Persona | Attributes | Expected Result | Why |
|---------|-----------|----------------|-----|
| Jane (QA Engineer) | internal, apac, beta | New hero | Individual target match |
| Akira (Premium APAC) | premium, apac, no beta | New hero | Rule 1: premium + apac |
| Sam (Free NA) | free, na, no beta | Old hero | No rules match → default false |
| Mei (Premium EMEA Beta) | premium, emea, beta | New hero | Rule 2: beta_tester = true |

Sam is the critical test — he proves the safety net works.

### Extra Credit: Experimentation

**Setup — Create the metric:**
1. Go to Metrics (under Data section in sidebar) → Create metric
2. Configure:
   - What to measure: **Occurrence**
   - Event kind: **Custom**
   - Event key: `cta-clicked` (must match the `track()` call in code)
   - Randomization unit: **user**
   - Success criteria: **Higher is better**
   - Name: **CTA Click Rate**

**Setup — Create the experiment:**
1. Go to Experiments → Create experiment
2. Configure:
   - Name: **Hero Section A/B Test**
   - Hypothesis: *"The new hero section with AI messaging will drive more CTA clicks than the current hero."*
   - Metric: **CTA Click Rate**
   - Flag: `new-hero-section`
   - Targeting rule: **Default Rule**
   - Audience allocation: **100%**
   - Variations split: **50% true / 50% false**
   - Control: **false**
   - Statistical approach: **Bayesian, 95% threshold**
3. Click **Start** to begin the iteration

**Testing:**
1. Switch to Sam (the only persona on the default rule — individually targeted and rule-matched users are excluded from the experiment)
2. Click the CTA button several times
3. Wait a few minutes, then check the Results tab
4. You should see conversions and exposures registering

**Note:** Statistical significance requires thousands of users. The goal here is to demonstrate the experiment setup, event flow, and results UI — not to reach a conclusive result.

---

## Architecture Decisions

**Why React + client-side SDK:** The demo story requires visual, instant feedback. A server-side SDK would require page refreshes to reflect flag changes, losing the "wow moment" of real-time toggling. In production, sensitive flags (pricing logic, entitlements) should use a server-side SDK to prevent client inspection of flag values.

**Why `asyncWithLDProvider`:** The async variant waits for the SDK to connect and fetch flag values before the app renders. Without it, users see a flash of the default experience before the correct variation loads.

**Why a persona switcher instead of hardcoded users:** It makes targeting rules visually provable. A reviewer (or a VP of Engineering watching a live demo) can click personas and watch rules evaluate in real-time, rather than reading code to infer behavior.

**Why `identify()` on persona switch:** In a real app, `identify()` fires on login or account switch. Here it fires on persona click to simulate the same flow. The SDK closes the current streaming connection and opens a new one for the new context, re-evaluating all flags.

---

## Project Structure

```
horizon-app/
├── .env                        # LaunchDarkly client-side ID (not committed)
├── index.html                  # Vite entry point
├── package.json
├── src/
│   ├── main.jsx                # App entry — initializes LD provider with context
│   ├── App.jsx                 # Reads flag, renders correct hero
│   ├── HeroOld.jsx             # Current landing page (flag OFF)
│   ├── HeroNew.jsx             # New feature (flag ON)
│   ├── PersonaSwitcher.jsx     # Demo tool — switches user context
│   └── index.css               # Minimal global styles
└── README.md
```

---

## Environment & Assumptions

- Node.js v20+ required
- Tested on macOS with Chrome
- Uses Vite v8 as the dev server
- LaunchDarkly React SDK (`launchdarkly-react-client-sdk`)
- No backend required — everything runs client-side
- The `.env` file is gitignored — the reviewer creates their own

---

## SDK & Flag Reference

| Item | Value |
|------|-------|
| SDK | `launchdarkly-react-client-sdk` |
| Flag key | `new-hero-section` |
| Flag type | Boolean |
| Metric event key | `cta-clicked` |
| SDK key location | `.env` → `VITE_LD_CLIENT_SIDE_ID` |
| SDK key type | Client-side ID (not server-side SDK key) |
