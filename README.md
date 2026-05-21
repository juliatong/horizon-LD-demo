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
- **Remediate via automation** - a single script call turns off the flag remotely, simulating what PagerDuty, Datadog, or any incident response tool would do via webhook. The feature dies without a human touching the dashboard.

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
git clone https://github.com/juliatong/horizon-ld-demo.git
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

**Important:** Under the flag's **Settings** tab, ensure **"Client-side SDK availability"** is checked. The React SDK requires this. Without it, the flag returns undefined and the app renders the safe default with a console warning explaining the fix.

### 3. Configure your SDK key

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Then fill in your Client-side ID in `.env`:

```
VITE_LD_CLIENT_SIDE_ID=your-client-side-id-here
```

<!-- REVIEWER: Replace with your Client-side ID.
     Find it at: LD Dashboard -> Project Settings -> Environments -> your environment -> Client-side ID
     This must be the Client-side ID, not the server-side SDK key. -->

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

**Act 3 - Incident response (the kill switch):**
1. Set the default rule back to `true` (feature is live)
2. Set your credentials in a terminal:

```bash
export LD_API_TOKEN=your-api-access-token
export LD_ENV=test
```

3. Run the kill script:

```bash
./kill-feature.sh
```

<!-- REVIEWER: Create an API token at: LD Dashboard -> Account Settings -> Authorization -> Create token
     Role required: Writer or Admin

     Note on triggers: LaunchDarkly's native trigger feature (which generates a pre-baked webhook URL
     requiring no auth headers) is available on Enterprise plans. This demo achieves the same
     incident-response pattern via the REST API. In a customer environment with triggers enabled,
     replace this script with a single: curl -X POST <trigger-url>
     No headers. No payload. One command wired directly into your monitoring tool. -->

4. Watch the browser - the feature dies without touching the dashboard. This is what automated incident response looks like: PagerDuty fires, webhook hits LaunchDarkly, broken feature is off in seconds.

**Restoring after the kill switch (reset for Part 2):**

```bash
./enable-feature.sh
```

This turns targeting back ON. Then confirm the default rule is set to `false` in the dashboard before running the Part 2 targeting demo.

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

**Create a second metric (optional but recommended):**
- Event key: `trial-started`
- What to measure: **Occurrence**
- Success criteria: **Higher is better**
- Name: **Trial Start Rate**
- Add this as a secondary metric when creating the experiment

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
2. Click the CTA button several times - each click fires two events: `cta-clicked` (primary, intent) and `trial-started` (secondary, conversion)
3. Wait a few minutes, then check the Results tab
4. You should see conversions and exposures registering for both metrics

**Note on experiment audience bias:** This experiment measures conversion for users who fall through to the default rule - the general population not covered by targeting rules. Enterprise and beta users are pre-committed to a variation and excluded from the experiment. In a production setup, a separate experiment flag would be used to measure conversion across the full user base independently of the targeting rollout. This is a known architectural tension: the more sophisticated your targeting rules, the smaller and more biased your experiment audience becomes.

**Note on metrics:** Two metrics are tracked on each CTA click. `cta-clicked` is a leading indicator - it measures intent but not outcome. A user can click and immediately bounce. `trial-started` is the conversion signal - in production this would fire after signup form submission, not on button click. Both are tracked here to demonstrate the multi-metric experiment pattern and the distinction between intent and conversion.

**Note on statistical significance:** Reaching a conclusive result requires thousands of users. The goal here is to demonstrate experiment setup, event flow, multi-metric tracking, and the results UI - not to reach statistical significance.

**Note on variation assignment:** When the experiment is running, Sam's variation is determined by a hash of his user key against the 50/50 traffic split. This means Sam will consistently see the same variation within a session - but which variation (HeroOld or HeroNew) depends on how his key hashes. Do not assume Sam will see HeroOld during the experiment. Either outcome is correct experiment behaviour. What matters for verification is that the CTA click fires both `cta-clicked` and `trial-started` events regardless of which variation Sam is assigned to. This is also why stopping the experiment and shipping `false` is required before running the Part 2 targeting demo - otherwise Sam's variation is experiment-controlled and you cannot guarantee he sees HeroOld as the default fallthrough proof.

---

## Architecture Decisions

**Why React + client-side SDK:** The demo story requires visual, instant feedback. A server-side SDK would require page refreshes to reflect flag changes, losing the "wow moment" of real-time toggling. In production, sensitive flags (pricing logic, entitlements) should use a server-side SDK to prevent client inspection of flag values.

**Why `asyncWithLDProvider` over `withLDProvider`:** The two providers differ in when SDK initialization happens relative to React rendering. `withLDProvider` initializes the SDK at `componentDidMount` - meaning the app renders first, then the SDK connects, then flags arrive. On that first render, `useFlags()` returns an empty object, the flag is undefined, and the app briefly shows the default experience before flipping to the correct variation. That flicker is visible and looks broken in a demo. `asyncWithLDProvider` with `await` moves SDK initialization before render entirely - execution blocks at the `await` until the SDK connects and returns flag values, then the app renders once with the correct values already loaded. No flicker, no undefined state, no visible correction. The naming is counterintuitive: `asyncWithLDProvider` is the async function, but awaiting it produces blocking behaviour. `withLDProvider` sounds synchronous but is actually non-blocking because React controls its lifecycle. The right mental model is not sync vs async - it is who controls timing. With `withLDProvider`, React controls when the SDK initializes (after mount). With `asyncWithLDProvider` and `await`, you control it (before render). For a demo where first impression matters, controlling that timing is the right call. For an app that already has a loading state (auth check, data fetch), `withLDProvider` is fine - the existing spinner hides the flag evaluation latency and you avoid blocking render unnecessarily.

**Why multi-context (user + account + device):** A flat user model breaks down in enterprise B2B SaaS. Consider: Acme Corp upgrades from free to enterprise. With a flat model, you update the plan attribute on every user record - N writes, risk of inconsistency during the update window. With a separate account context, you update one record and all users in that account instantly see the enterprise experience. The three context kinds here represent three independent axes of targeting - who the person is, what organization they belong to, and what device they are on. These change independently and drive different rollout decisions.

**Why a persona switcher:** It makes targeting rules visually provable. A reviewer can click personas and watch rules evaluate in real-time across all three context kinds, rather than reading code to infer behavior. The active persona shows exactly which rule fired and why.

**Why `identify()` on persona switch:** In a real app, `identify()` fires on login or account switch. Here it fires on persona click to simulate the same flow. The SDK closes the current streaming connection and opens a new one for the new multi-context, re-evaluating all flags simultaneously.

**Why the experiment runs on the default rule only:** Individually targeted users (Jane) and rule-matched users (Akira, Mei) are already committed to a variation. Running an experiment on them would contaminate the results - they are not in the general population being tested. Only Sam, who falls through to the default rule, represents the unbiased audience the experiment measures.

**Why client-side context is acceptable here, and when it is not:** Context attributes in this demo are client-constructed - the browser builds the identify() call with user, account, and device attributes and sends them to LD without server verification. LD evaluates these attributes at face value. This means a motivated user could open DevTools, find the identify() call, and craft a context claiming to be enterprise tier or a beta tester. For this demo, that is an acceptable risk - the flag controls a visual UI change with zero business consequence if bypassed. In production, any flag that enforces a business rule (entitlements, pricing gates, access control) requires server-verified identity. There are two production patterns for this. First, server-side SDK evaluation: the client never touches LD directly, the server evaluates flags against verified attributes from your database and returns the rendered result - flag values and context attributes never reach the browser. Second, server-issued signed context: the client authenticates with your server, the server returns a signed token containing verified attributes, the client passes it to LD which verifies the signature - the client gets real-time streaming updates but cannot tamper with the attributes. The rule of thumb: if bypassing a flag has a business consequence, context must come from your server. If it is purely visual, client-side is fine.

**Why error handling is explicit, not silent:** Three failure modes are handled deliberately. First, `asyncWithLDProvider` has a 5-second timeout - without it the app hangs on a blank screen if LD is unreachable. On timeout or initialization failure, the app falls back to safe defaults (flag off = old hero) rather than crashing. Second, `identify()` is wrapped in try/catch with a finally block - a network blip during persona switch would otherwise leave the panel permanently frozen. The finally block ensures state always resets whether the call succeeds or fails. Third, the flag value uses the `??` operator to guard against undefined - if the reviewer forgets to create the flag or enable client-side SDK availability, the app renders the safe default and logs a clear console warning explaining exactly what to fix. The principle throughout: fail closed (show old experience), not open (accidentally release an untested feature).

---

## Project Structure

```
horizon-app/
|-- .env                        # LaunchDarkly client-side ID (not committed)
|-- index.html                  # Vite entry point
|-- kill-feature.sh             # Incident response simulation - kills feature via REST API
|-- enable-feature.sh           # Restores feature flag after kill-feature.sh
|-- .env.example                # Template for .env - copy and fill in your values
|-- .nvmrc                      # Node version pin: 20
|-- package.json
|-- src/
|   |-- main.jsx                # App entry - multi-context init, timeout, catch block
|   |-- App.jsx                 # Flag undefined guard, hero routing, persona switcher
|   |-- HeroOld.jsx             # Current landing page (flag OFF) - tracks CTA clicks
|   |-- HeroNew.jsx             # New feature (flag ON) - tracks CTA clicks
|   |-- PersonaSwitcher.jsx     # Multi-context persona switch, try/catch, error state
|   `-- index.css               # Minimal global styles
`-- README.md
```

---

## Demo State Guide

Each part of the demo requires a specific flag state. Run these in order and reset between parts to avoid state conflicts.

| Demo part | Targeting | Default rule | Experiment |
|-----------|-----------|--------------|------------|
| App loads (baseline) | ON | false | Stopped |
| Part 1 - Act 1 (release) | ON | true | Stopped |
| Part 1 - Act 2 (rollback) | ON | false | Stopped |
| Part 1 - Act 3 (kill switch) | ON | true | Stopped |
| Part 2 (targeting) | ON | false | Stopped |
| Experimentation | ON | false | Running |

**Reset sequence between Part 1 and Part 2:**
1. Turn targeting back ON if kill switch was run
2. Set default rule back to `false`
3. Confirm targeting rules are configured (individual target + Rule 1 + Rule 2)

**Reset sequence before Experimentation demo:**
1. Confirm targeting is ON, default rule is `false`
2. Start the experiment iteration in the dashboard
3. Switch to Sam - he is the only persona on the default rule
4. Click CTA buttons to generate events
5. Wait a few minutes for results to appear

---

## Environment & Assumptions

- Node.js v20+ required
- Tested on macOS with Chrome
- Uses Vite v8 as the dev server
- LaunchDarkly React SDK (`launchdarkly-react-client-sdk`)
- No backend required - everything runs client-side
- The `.env` file is gitignored - the reviewer creates their own
- `kill-feature.sh` requires an LD API token with Writer or Admin role

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
| SDK key location | `.env` -> `VITE_LD_CLIENT_SIDE_ID` |
| SDK key type | Client-side ID (not server-side SDK key) |
