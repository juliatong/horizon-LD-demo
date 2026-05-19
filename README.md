# Horizon Analytics - LaunchDarkly Feature Flag Demo

## The Problem

Your company ships code every two weeks, but releasing features is a different story. Deploys take 45 minutes. Rollbacks take longer. Last quarter, a broken feature made it to production on a Friday afternoon - it took three hours and two engineers to revert. Leadership is pushing to ship faster, but not at the cost of stability.

LaunchDarkly decouples **deployment** from **release**. Code ships when it's ready. Features go live when *you* decide - and come back down in milliseconds if anything goes wrong.

This demo shows how, using a realistic SaaS landing page for a fictional company called Horizon Analytics.

---

## What This Demo Shows

### Part 1: Release & Remediate

A single boolean feature flag (`new-hero-section`) controls a redesigned hero section. With this flag, you can:

- **Release instantly** - toggle the flag ON in the LaunchDarkly dashboard. The UI updates in real-time with zero page reload, powered by LaunchDarkly's streaming SSE connection.
- **Roll back instantly** - toggle the flag OFF. The old experience returns in under a second. No rollback deploy, no CI pipeline, no downtime.
- **Remediate via automation** - a single `curl` command turns off the flag remotely, simulating what PagerDuty, Datadog, or any incident response tool would do via webhook. The feature dies without a human touching the dashboard.

### Part 2: Target

The same flag, now with precision. Instead of all-or-nothing, targeting rules control exactly who sees the new experience.

This demo uses a **multi-context model** - three independent context kinds evaluated simultaneously:

- `user` - the human (role, beta opt-in)
- `account` - the paying organization (plan, region)
- `device` - the machine they're on (type: desktop / mobile)

Separating these context kinds reflects how enterprise B2B SaaS actually structures data. A plan upgrade at the account level instantly affects all users in that account - without touching individual user records.

Targeting rules:
- **Individual targeting** - QA engineer `qa-jane` is individually targeted on the `user` context. Always sees the feature regardless of rules.
- **Rule 1: Enterprise APAC accounts** - `account.plan = enterprise` AND `account.region = apac`. The plan lives on the account context, not the user - one org upgrade affects all their users instantly.
- **Rule 2: Beta testers on desktop** - `user.beta_tester = true` AND `device.type = desktop`. A cross-context rule spanning two context kinds simultaneously. If Mei switches to mobile, she drops to default - even though her beta opt-in has not changed.
- **Default fallthrough** - everyone else sees the current experience. The safety net.

A **persona switcher** in the bottom-right corner lets you switch between four demo users and watch the UI update instantly. Each persona carries all three context kinds, visible as badges in the panel.

### Extra Credit: Experimentation

The Product Manager needs data to justify the new hero section. Opinions are not enough - did the redesign actually drive more engagement? LaunchDarkly Experimentation answers this by running an A/B test directly on the feature flag:

- **Metric** - a custom `cta-clicked` event fires when any user clicks the CTA button on either hero variation.
- **Experiment** - a 50/50 split on the default rule measures CTA click-through rate across the old hero (control) vs. the new hero (treatment).
- **Result** - the experiment results UI shows conversions, exposures, and statistical analysis. With sufficient traffic, this gives the PM a data-driven answer.

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
     Find it at: LaunchDarkly Dashboard -> Project Settings -> Environments -> your environment -> Client-side ID -->

### 4. Run the app

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Demo Walkthrough

### Part 1: Release & Remediate

**Setup:** Turn targeting ON. Set the default rule to serve `false`. All users see the old hero.

**Act 1 - The safe release:**
1. Open the app in your browser - you see "Welcome to Horizon Analytics" (old hero)
2. In the LD dashboard, change the default rule to serve `true`
3. Watch the browser - the hero swaps to "Introducing Horizon AI Insights" instantly. No page reload.

**Act 2 - The instant rollback:**
1. In the LD dashboard, change the default rule back to `false`
2. The old hero returns instantly

**Act 3 - Incident response (the curl kill switch):**
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

<!-- REVIEWER: Replace YOUR_API_TOKEN with an API access token (create one at Account Settings -> Authorization).
     Replace YOUR_ENVIRONMENT_KEY with your environment key (e.g., "test" or "production").

     Note on triggers: LaunchDarkly's native trigger feature (which generates a pre-baked webhook URL
     requiring no auth headers) is available on Enterprise plans. This demo achieves the same
     incident-response pattern via the REST API. In a customer environment with triggers enabled,
     replace this script with a single curl -X POST <trigger-url> - no headers, no payload,
     one command wired directly into your monitoring tool. -->

3. Watch the browser - the feature dies without touching the dashboard. This is what automated incident response looks like: PagerDuty fires, webhook hits LaunchDarkly, broken feature is off in seconds.

### Part 2: Target

**Setup:** Turn targeting back ON. Configure these targeting rules:

**Individual targets:**
- `true` variation -> add `qa-jane`

**Rule 1 - Enterprise APAC accounts (account context):**
- Context kind: `account`
- Attribute: `plan` is one of `enterprise`
- AND Attribute: `region` is one of `apac`
- Serve: `true`

**Rule 2 - Beta testers on desktop (cross-context rule):**
- Context kind: `user`
- Attribute: `beta_tester` is one of `true`
- AND Context kind: `device`
- AND Attribute: `type` is one of `desktop`
- Serve: `true`

**Default rule:** serve `false`

**Testing with the persona switcher:**

Click each persona in the bottom-right panel and observe:

| Persona | User context | Account context | Device context | Expected | Why |
|---------|-------------|-----------------|----------------|----------|-----|
| Jane (QA Engineer) | role: internal, beta: true | enterprise, apac | desktop | New hero | Individual target |
| Akira (Enterprise APAC) | role: member, beta: false | enterprise, apac | desktop | New hero | Rule 1: account context |
| Sam (Free NA) | role: member, beta: false | free, na | desktop | Old hero | Default fallthrough |
| Mei (Beta, Desktop) | role: member, beta: true | enterprise, emea | desktop | New hero | Rule 2: cross-context |

Sam is the critical test - he proves the safety net works.

**The cross-context proof (Mei):**
Change `device_type` from `desktop` to `mobile` in `PersonaSwitcher.jsx` for Mei's persona and click her. She drops to the old hero - even though `user.beta_tester` is still true. Both context kinds must be true simultaneously. This is something a flat user model cannot cleanly express.

### Extra Credit: Experimentation

**Setup - Create the metric:**
1. Go to Metrics (under Data section in sidebar) -> Create metric
2. Configure:
   - What to measure: **Occurrence**
   - Event kind: **Custom**
   - Event key: `cta-clicked` (must match the `track()` call in code exactly)
   - Randomization unit: **user**
   - Success criteria: **Higher is better**
   - Name: **CTA Click Rate**

**Setup - Create the experiment:**
1. Go to Experiments -> Create experiment
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
1. Switch to Sam (the only persona on the default rule - individually targeted and rule-matched users are excluded from the experiment)
2. Click the CTA button several times
3. Wait a few minutes, then check the Results tab
4. You should see conversions and exposures registering

**Note:** Statistical significance requires thousands of users. The goal here is to demonstrate the experiment setup, event flow, and results UI - not to reach a conclusive result.

---

## Architecture Decisions

**Why React + client-side SDK:** The demo story requires visual, instant feedback. A server-side SDK would require page refreshes to reflect flag changes, losing the "wow moment" of real-time toggling. In production, sensitive flags (pricing logic, entitlements) should use a server-side SDK to prevent client inspection of flag values.

**Why `asyncWithLDProvider`:** The async variant waits for the SDK to connect and fetch flag values before the app renders. Without it, users see a flash of the default experience before the correct variation loads.

**Why multi-context (user + account + device):** A flat user model breaks down in enterprise B2B SaaS. Consider: Acme Corp upgrades from free to enterprise. With a flat model, you update the plan attribute on every user record - N writes, risk of inconsistency during the update window. With a separate account context, you update one record and all users in that account instantly see the enterprise experience. The three context kinds here represent three independent axes of targeting - who the person is, what organization they belong to, and what device they are on. These change independently and drive different rollout decisions.

**Why a persona switcher:** It makes targeting rules visually provable. A reviewer can click personas and watch rules evaluate in real-time across all three context kinds, rather than reading code to infer behavior. The active persona shows exactly which rule fired and why.

**Why `identify()` on persona switch:** In a real app, `identify()` fires on login or account switch. Here it fires on persona click to simulate the same flow. The SDK closes the current streaming connection and opens a new one for the new multi-context, re-evaluating all flags simultaneously.

**Why the experiment runs on the default rule only:** Individually targeted users (Jane) and rule-matched users (Akira, Mei) are already committed to a variation. Running an experiment on them would contaminate the results - they are not in the general population being tested. Only Sam, who falls through to the default rule, represents the unbiased audience the experiment measures.

---

## Project Structure

```
horizon-app/
|-- .env                        # LaunchDarkly client-side ID (not committed)
|-- index.html                  # Vite entry point
|-- package.json
|-- src/
|   |-- main.jsx                # App entry - initializes LD provider with multi-context
|   |-- App.jsx                 # Reads flag, renders correct hero
|   |-- HeroOld.jsx             # Current landing page (flag OFF)
|   |-- HeroNew.jsx             # New feature (flag ON) - tracks cta-clicked event
|   |-- PersonaSwitcher.jsx     # Demo tool - switches multi-context (user+account+device)
|   `-- index.css               # Minimal global styles
`-- README.md
```

---

## Environment & Assumptions

- Node.js v20+ required
- Tested on macOS with Chrome
- Uses Vite v8 as the dev server
- LaunchDarkly React SDK (`launchdarkly-react-client-sdk`)
- No backend required - everything runs client-side
- The `.env` file is gitignored - the reviewer creates their own

---

## SDK & Flag Reference

| Item | Value |
|------|-------|
| SDK | `launchdarkly-react-client-sdk` |
| Flag key | `new-hero-section` |
| Flag type | Boolean |
| Context kinds | `user`, `account`, `device` |
| Metric event key | `cta-clicked` |
| SDK key location | `.env` -> `VITE_LD_CLIENT_SIDE_ID` |
| SDK key type | Client-side ID (not server-side SDK key) |
