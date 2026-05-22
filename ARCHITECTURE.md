# Architecture Decisions - Horizon Analytics / LaunchDarkly Demo

Technical depth reference for the Meridian Digital LaunchDarkly SE exercise.
For setup and operations, see [README.md](./README.md).
For the pitch narrative and stakeholder strategy, see [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

---

## 1. Multi-Context Model — Independent Axes of Targeting

This is the highest-value architectural decision in this demo. It maps directly to how enterprise B2B SaaS actually structures data — and it's the decision most candidates skip.

### The Problem With Flat Contexts

Every B2B product eventually hits this scenario:

> "Acme Corp just upgraded from free to enterprise. How do we give all 120 of their users the enterprise experience — right now, without a backfill job?"

```
FLAT USER MODEL:
  Update plan attribute on every user record
  -> 120 database writes
  -> Risk of inconsistency during the update window
  -> Some users see free, some see enterprise during transition
  -> Maintenance burden grows with every org that upgrades

ACCOUNT CONTEXT:
  Update one account record
  -> All 120 users instantly see enterprise
  -> Zero propagation lag
  -> Zero inconsistency
  -> Scales to 10,000 orgs the same way it scales to 1
```

### The Three Context Kinds in This Demo

```
user    -> the human
           Attributes: role, beta_tester
           Changes when: the person changes their preferences
           Targeting story: "QA team always sees it first"

account -> the paying organization
           Attributes: plan, region
           Changes when: the org upgrades, moves region, changes tier
           Targeting story: "enterprise APAC accounts before anyone else"
           Key insight: plan lives HERE, not on user

device  -> the machine
           Attributes: type (desktop / mobile)
           Changes when: the user switches devices
           Targeting story: "desktop before mobile — different QA cycles"
           Note: keys are stable per persona for demo repeatability.
                 In production, device keys are generated per physical
                 device and persisted in localStorage.
```

### The Design Rule

```
Ask: "Can this attribute change WITHOUT the other context kind changing?"

YES -> separate context kind
NO  -> same context kind
```

User email changes — doesn't change their org's plan. Separate.
Org upgrades plan — doesn't change individual users. Separate.
User switches device — doesn't change their beta opt-in. Separate.

### The Cross-Context Rule — The Demo Moment That Matters

Rule 2 in this demo requires two context kinds simultaneously:

```
user.beta_tester = true  AND  device.type = desktop  ->  true
```

Mei is a beta tester on desktop. She gets the feature. Switch her to mobile — same user, same beta opt-in, different device context. She drops to default. The rule failed because one of its two independent axes changed.

This cannot be cleanly expressed with a flat user model. It requires two independently-evaluated context kinds. That is the architectural point.

---

## 2. SDK Type — Where Does the Trust Boundary Sit?

This is a product and security decision, not a technical preference. The question is how much of your flag logic you are willing to have exist outside your own infrastructure.

### The Core Question

> If your flag rules were visible to a competitor, would that damage your business?

```
YES -> Server SDK. Rules stay inside your walls.
NO  -> Client SDK is acceptable for this use case.
```

### Comparison

| | Server SDK | Client / Mobile SDK |
|--|------------|---------------------|
| **Evaluation** | On your backend — ruleset cached locally | On LD's servers — results sent to device |
| **LD visibility** | None — LD never sees your end users | Full — every user is a direct LD connection |
| **SSE streams** | 1 stream regardless of user count | 1 stream per connected user |
| **Business logic** | Never leaves your infrastructure | Evaluated outside your infrastructure |
| **Billing** | Flat — seats and plan tier | MAU — grows linearly with user base |
| **Resilience** | Highest — LD not in request path | Moderate — LD is in the critical path |
| **Use when** | Rules reveal competitive or strategic intent | Flags must reach browser or device directly |

### This Demo's Justified Choice

This demo uses the client-side React SDK because the flag controls a visual UI change — no entitlement enforced, no business consequence if a user inspects the flag value. Real-time streaming to the browser is required for the demo's instant-toggle moment. Server SDK cannot do this without a custom WebSocket layer.

In production: entitlements, pricing gates, and access control belong server-side. Visual feature flags and UI experiments are appropriate for client-side. Most mature products use both.

### The Exploit This Enables

With client-side SDK, every flag value is readable in DevTools. A motivated user can:

```
1. Open DevTools -> Network tab
2. See flag values returned to the browser:
   { "premium-dashboard-access": false }
3. Write a browser extension that intercepts
   the LD response and changes false -> true
4. Access the premium feature without paying
```

This is not theoretical. It is how client-side entitlement gates get bypassed in production. The line: if bypass has a commercial consequence, context must be server-verified. Two production patterns:

```
Pattern 1: Server-side SDK evaluation
  Server evaluates flags against verified attributes
  from your database. Flag values never reach the browser.

Pattern 2: Server-issued signed context
  Server returns a signed JWT with verified attributes.
  Client passes JWT to LD — LD verifies the signature.
  Client cannot tamper with plan or role.
  Client still gets real-time SSE updates.
```

---

## 3. Initialisation Strategy — Correctness First or Speed First?

Specific to client SDK. This decision is about what your users see in the 100-300ms gap between page load and LaunchDarkly responding.

### The Core Question

> If a user sees the wrong version of this UI for 200ms, does it matter?

```
YES -> asyncWithLDProvider (block render until flags ready)
NO  -> withLDProvider (render immediately, correct later)
```

### Comparison

| | `withLDProvider` — speed first | `asyncWithLDProvider` — correctness first |
|--|--------------------------------|------------------------------------------|
| **Renders at** | 0ms — immediately | 150-300ms — after LD responds |
| **Flag values** | Wrong at first render (defaults) | Correct at first and only render |
| **On LD response** | Re-renders — flicker visible | Single render — zero flicker |
| **Risk** | Layout shift, mis-clicks, trust erosion | Blank screen if LD is slow or down |
| **Use when** | Defaults are safe for a brief moment | Wrong values cause real harm |

### The Naming Trap

`asyncWithLDProvider` is the **blocking** option. The naming describes its JavaScript return type (a Promise), not its rendering behaviour. `withLDProvider` initialises at `componentDidMount` — the app renders before the SDK connects. `asyncWithLDProvider` with `await` blocks render until the SDK responds. The `await` is what creates the block.

### This Demo's Justified Choice

`asyncWithLDProvider` with `await` — this flag controls a layout-defining hero section. A visible flicker during a live demo undermines the credibility of the demonstration. In production with an existing loading state (auth check, data fetch), `withLDProvider` is acceptable — the spinner masks the flag evaluation latency.

### 3a. Bootstrap — Eliminating the Tradeoff Entirely

Bootstrap answers a specific dissatisfaction: neither option above is good enough. It eliminates the correctness-versus-speed tradeoff entirely by arriving already knowing the correct flag values before the first render.

```
CLIENT BOOTSTRAP (server-rendered apps):
  Server evaluates flags using server SDK cache
  Injects window.__LD_BOOTSTRAP__ into HTML before delivery
  Browser arrives knowing correct values before JS runs
  Zero flicker. Zero render delay. Zero gap.
  Client SDK SSE connects in background for live updates.
  Requires: Next.js, Rails, Django, or any server rendering layer.

SERVER BOOTSTRAP (auto-scaling backends):
  LD ruleset persisted to Redis / Memcached on startup
  Server reads cache — instantly has rules before first request
  Critical for auto-scaling — new instances are never cold.
  Requires: Redis or Memcached alongside your server.
```

This demo is a client-side React SPA served from Vite — no server rendering layer. Bootstrap is not applicable here. For a production Next.js landing page at 40,000 daily visitors, bootstrap is the correct architecture.

---

## 4. Billing Insight — The Architecture Expressed as a Contract

This is not a product decision. It is an observation about how deeply architecture determines commercial outcomes. Understand it before you sign a contract.

### Why the Billing Units Are Opposite

LaunchDarkly charges for exactly what it can see and what it does. Because the two SDK types are architecturally opposite, their billing units are opposite too.

```
Server SDK:
  LD ships rules to your server once and steps away.
  LD never sees your end users.
  Cannot charge per user because it never sees them.
  -> Flat billing: seats and plan tier.

Client / Mobile SDK:
  LD evaluates for every user.
  Maintains one SSE stream per connected user.
  Every user is a direct LD workload.
  -> MAU billing: grows linearly with your user base.
```

The billing model did not emerge from a pricing committee. It emerged from the SSE architecture.

### The Compounding Risk

```
Users          Server SDK cost       Client SDK cost
10,000         Flat — no change      10,000 MAU
500,000        Flat — no change      500,000 MAU
10,000,000     Flat — no change      10,000,000 MAU
```

At growth stage, client/mobile SDK MAU cost compounds faster than expected. Teams that understand this architect a server SDK layer early — not to save money today, but to retain cost control as scale compounds. The architecture decision and the commercial decision are the same decision.

---

## 5. Migration Triggers — When to Evolve the Architecture

| Trigger | Action |
|---------|--------|
| You add a flag that enforces an entitlement or paywall | Move that flag's evaluation to server-side SDK |
| MAU-based LD bill starts scaling uncomfortably | Add server SDK layer for high-traffic flag evaluation |
| You add server rendering (Next.js, Rails, etc.) | Bootstrap becomes available — eliminates correctness/speed tradeoff |
| You need to evaluate flags in a service-to-service call | Server SDK — no browser, no SSE, no MAU charge |
| Security review requires zero user data leaving infrastructure | Server SDK — LD sees your server, never your users |
| New instances cold-starting under auto-scaling load | Server bootstrap with Redis — instances are never cold |

---

## 6. SDK Resilience and Caching — Production Behaviour Under Failure

The LD React SDK caches flag values in both memory and localStorage automatically. LaunchDarkly is not in your critical path after initialisation.

```
App starts     -> SDK connects to LD
               -> fetches flag values
               -> stores in memory (runtime cache)
               -> stores in localStorage (persistent cache)

LD goes down   -> streaming connection drops
               -> SDK detects disconnection
               -> continues serving last known cached values
               -> app keeps running with no errors, no broken UI
               -> users see no change

LD comes back  -> SDK reconnects automatically
               -> fetches latest flag values
               -> resumes normal operation
```

Visible right now in DevTools -> Application -> Local Storage -> localhost:5173. The key format is `ld:YOUR_CLIENT_ID:...` containing the current flag state.

Three layers of resilience in this demo:

```
Layer 1: localStorage cache      -> mid-session LD outages
Layer 2: 5-second init timeout   -> startup failures
Layer 3: DEFAULT_FLAGS constant  -> no cached values exist
                                    (wrong SDK key, first run)
```

The principle: the app has a safe answer at every failure point. It never presents a broken state to the user.

---

## 7. Error Handling — Deliberate, Not Defensive

Three failure modes handled explicitly. Each one has a reason, not just a pattern.

### Failure Mode 1: SDK Unreachable at Startup

```javascript
asyncWithLDProvider({
  timeout: 5,           // don't hang — render after 5s regardless
  flags: DEFAULT_FLAGS, // serve safe defaults on timeout
})

catch (error) {
  // bad SDK key, network failure before timeout
  LDProvider = ({ children }) => children; // pass-through, serve defaults
}
```

Without this: blank screen indefinitely if LD is unreachable at startup.
Design choice: `DEFAULT_FLAGS = { 'new-hero-section': false }` — fail closed. Show the safe existing experience, never accidentally release an untested feature.

### Failure Mode 2: identify() Fails Mid-Session

```javascript
try {
  await ldClient.identify(newContext);
  setActiveKey(persona.key);
} catch (err) {
  setError('Failed to switch persona...');
} finally {
  setSwitching(false);   // always reset — success or failure
  setLoadingKey(null);   // always reset — success or failure
}
```

The `finally` block is the critical detail. Without it, a failed `identify()` leaves `switching = true` permanently. The panel freezes. Only a page reload recovers it. `finally` guarantees state resets regardless of outcome — a pattern that only becomes obvious after you've been burned by its absence in production.

### Failure Mode 3: Flag Value Undefined

```javascript
// Single source of truth
export const DEFAULT_FLAGS = { 'new-hero-section': false }; // constants.js

// Guard in App.jsx
const newHeroSection = flags.newHeroSection ?? DEFAULT_FLAGS['new-hero-section'];
```

Triggers when: flag not created in the reviewer's account, or client-side SDK availability not enabled. Without the guard, undefined silently renders the old hero with no indication of why. With the guard, a console warning names the exact cause and fix. `DEFAULT_FLAGS` defined once in `constants.js` — imported by both `main.jsx` and `App.jsx` — prevents the two values silently diverging if one is changed.