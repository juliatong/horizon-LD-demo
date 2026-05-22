# Architecture Decisions - Horizon Analytics

Feature flag integration architecture and SDK decision framework.
For setup and operations, see [README.md](./README.md).
For pitch narrative and stakeholder strategy, see [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

---

## 1. Multi-Context Model — Independent Axes of Targeting

The context model is a data modeling decision before it is a LaunchDarkly decision. Getting this right determines whether your targeting rules remain maintainable as your product and customer base grow.

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
  -> Scales to 10,000 orgs identically
```

### The Three Context Kinds

```
user    -> the human
           Attributes: role, beta_tester
           Changes when: the person changes their preferences
           Targeting story: "internal team always gets it first"

account -> the paying organization
           Attributes: plan, region
           Changes when: org upgrades, changes region, changes tier
           Targeting story: "enterprise APAC before general rollout"
           Key principle: plan lives HERE, not on the user record

device  -> the machine
           Attributes: type (desktop / mobile)
           Changes when: the user switches devices
           Targeting story: "desktop before mobile — different
                             QA cycles and risk profiles"
           Production note: device keys should be generated per
                            physical device and persisted in
                            localStorage or via device fingerprinting.
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

### The Cross-Context Rule

Rule 2 requires two context kinds evaluated simultaneously:

```
user.beta_tester = true  AND  device.type = desktop  ->  true
```

A beta tester on desktop gets the feature. Switch to mobile — same user, same beta opt-in, different device context. The rule fails because one of its two independent axes changed.

This reflects a real production scenario: rolling out a new feature to opted-in users but gating on device type because mobile QA is incomplete. The device context is the gating mechanism that requires no changes to user-level attributes. A flat user model cannot express this cleanly — you would need to maintain a `beta_and_desktop` attribute that updates every time a user switches devices.

---

## 2. SDK Type — Where Does the Trust Boundary Sit?

This is a product and security decision, not a technical preference. The question is how much of your flag evaluation logic you are willing to have exist outside your own infrastructure.

### The Core Question

> If your flag rules were visible to a competitor, would that damage your business?

```
YES -> Server SDK. Rules stay inside your infrastructure.
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

### Decision Rationale

This integration uses the client-side React SDK because the flag controls a visual UI change — no entitlement enforced, no business consequence if a user inspects the flag value in DevTools. Real-time streaming to the browser is a requirement; a server-side SDK cannot deliver flag changes to the browser without a custom WebSocket or SSE layer built and maintained separately.

In production: entitlements, pricing gates, and access control belong server-side. Visual feature flags and UI experiments are appropriate for client-side. Most mature products use both, separating by the nature of the flag rather than by convenience.

### The Exploit This Enables

With client-side SDK, every flag value is readable in the browser. A motivated user can:

```
1. Open DevTools -> Network tab
2. Observe flag values returned from LaunchDarkly:
   { "premium-dashboard-access": false }
3. Write a browser extension that intercepts the response
   and changes false -> true
4. Access the premium feature without paying
```

This is not theoretical. It is how client-side entitlement gates fail in production. The boundary: if bypass has a commercial consequence, context must be server-verified.

Two production patterns for server-verified identity:

```
Pattern 1: Server-side SDK evaluation
  Server evaluates flags against verified attributes
  sourced from your database (plan, role, permissions).
  Flag values never reach the browser.

Pattern 2: Server-issued signed context
  Server returns a signed JWT containing verified attributes.
  Client passes JWT to LD — LD verifies the signature.
  Client cannot tamper with plan or role attributes.
  Client retains real-time SSE updates.
```

---

## 3. Initialisation Strategy — Correctness First or Speed First?

Specific to client SDK. This decision governs what users see in the 100-300ms gap between page load and LaunchDarkly responding.

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
| **On LD response** | Re-renders — layout shift visible | Single render — zero layout shift |
| **Risk** | Mis-clicks on shifted layout, trust erosion | Blank screen if LD is slow or down |
| **Use when** | Defaults are safe for a brief moment | Wrong values cause real harm |

### The Naming Trap

`asyncWithLDProvider` is the **blocking** option. The naming describes its JavaScript return type (a Promise), not its rendering behaviour. `withLDProvider` initialises at `componentDidMount` — the app renders before the SDK connects. `asyncWithLDProvider` with `await` blocks render until the SDK responds. The `await` is what creates the block, not the function name.

### Decision Rationale

`asyncWithLDProvider` with `await` — this flag controls a layout-defining hero section. A visible layout shift on first render erodes user trust, causes mis-clicks on a shifted CTA, and degrades the perceived quality of the page. Blocking render for 150-300ms is the correct tradeoff for a layout-defining element.

In production with an existing loading state (authentication check, data fetch), `withLDProvider` is appropriate — the spinner masks the flag evaluation latency, and blocking render unnecessarily adds to time-to-interactive.

A 5-second timeout prevents the blocking variant from hanging indefinitely on a slow or unreachable connection:

```javascript
asyncWithLDProvider({
  timeout: 5,           // render after 5s regardless of LD availability
  flags: DEFAULT_FLAGS, // safe defaults served on timeout
})
```

Recommended production range: 100-500ms. This integration uses 5 seconds to account for variable network conditions.

### 3a. Bootstrap — Eliminating the Tradeoff

Bootstrap answers a specific dissatisfaction: neither option above is good enough. It eliminates the correctness-versus-speed tradeoff entirely by ensuring the correct flag values are known before the first render begins — at zero cost to time-to-interactive.

```
CLIENT BOOTSTRAP (server-rendered applications):
  Server evaluates flags using a local server SDK cache.
  Injects window.__LD_BOOTSTRAP__ into HTML before delivery.
  Browser arrives knowing correct values before JavaScript runs.
  Zero layout shift. Zero render delay. Zero gap.
  Client SDK SSE connects in background for live updates.
  Requires: Next.js, Rails, Django, or any server rendering layer.

SERVER BOOTSTRAP (auto-scaling backends):
  LD ruleset persisted to Redis or Memcached on startup.
  Server reads from cache — has rules before the first request.
  New instances are never cold under auto-scaling load.
  Requires: Redis or Memcached alongside your server.
```

This integration is a client-side React SPA — no server rendering layer. Bootstrap is not applicable to this architecture. For a production Next.js landing page at 40,000 daily visitors, client bootstrap would be the correct architecture: server evaluates flags, injects them into HTML, client renders with zero gap.

---

## 4. Billing Insight — The Architecture Expressed as a Contract

This is not a product decision. It is an observation about how deeply architecture determines commercial outcomes. Understanding it before signing a contract prevents a compounding cost surprise at scale.

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

At growth stage, client/mobile SDK MAU cost compounds faster than expected. Teams that architect a server SDK layer early — not to save money at current scale, but to retain cost control as scale compounds — avoid a structural renegotiation with their vendor at the worst possible time.

> The architecture decision and the commercial decision are the same decision.

---

## 5. Migration Triggers — When to Evolve the Architecture

| Trigger | Action |
|---------|--------|
| A flag is added that enforces an entitlement or paywall | Move that flag's evaluation to server-side SDK |
| MAU-based bill grows faster than user value justifies | Add server SDK layer for high-traffic flag evaluation |
| Server rendering is added (Next.js, Rails, etc.) | Bootstrap becomes available — eliminates correctness/speed tradeoff |
| Flags are needed in service-to-service calls | Server SDK — no browser, no SSE, no MAU charge |
| Security review requires zero user data leaving infrastructure | Server SDK — LD sees your server, never your users |
| Auto-scaling introduces cold-start latency on new instances | Server bootstrap with Redis — instances are never cold |

---

## 6. SDK Resilience and Caching — Behaviour Under Failure

LaunchDarkly is not in the critical path after initialisation. The SDK caches flag values in both memory and localStorage automatically. An outage after initialisation is operationally invisible to users.

```
Initialisation  -> SDK connects to LD
                -> fetches flag values
                -> stores in memory (runtime cache)
                -> stores in localStorage (persistent cache)

LD goes down    -> streaming connection drops
                -> SDK detects disconnection
                -> continues serving last known cached values
                -> application keeps running with no errors
                -> users see no change

LD comes back   -> SDK reconnects automatically
                -> fetches latest flag values
                -> resumes normal operation
```

The localStorage cache is visible at:
DevTools -> Application -> Local Storage -> your domain.
Key format: `ld:YOUR_CLIENT_ID:...`

Three layers of resilience in this integration:

```
Layer 1: localStorage cache      -> mid-session LD outages
Layer 2: 5-second init timeout   -> startup failures
Layer 3: DEFAULT_FLAGS constant  -> no cached values exist
                                    (first run, wrong SDK key)
```

The system has a safe answer at every failure point. It never presents a broken state.

---

## 7. Error Handling — Deliberate, Not Defensive

Three failure modes handled explicitly. Each has a rationale grounded in what happens in production when it is absent.

### Failure Mode 1: SDK Unreachable at Startup

```javascript
asyncWithLDProvider({
  timeout: 5,
  flags: DEFAULT_FLAGS,
})

catch (error) {
  LDProvider = ({ children }) => children;
}
```

Without the catch block: a bad SDK key or pre-timeout network failure crashes the render entirely. With it: the app renders with safe defaults regardless of SDK state.

`DEFAULT_FLAGS = { 'new-hero-section': false }` — fail closed by design. The safe existing experience is shown rather than accidentally surfacing an untested feature to users.

### Failure Mode 2: identify() Fails Mid-Session

```javascript
try {
  await ldClient.identify(newContext);
  setActiveKey(persona.key);
} catch (err) {
  setError('Failed to switch context. Check connection and retry.');
} finally {
  setSwitching(false);
  setLoadingKey(null);
}
```

The `finally` block is the critical detail. Without it, a failed `identify()` leaves `switching = true` permanently. The UI freezes. Only a full page reload recovers the session. `finally` guarantees state resets regardless of outcome — a pattern that only becomes obvious after it is missing in a production incident.

### Failure Mode 3: Flag Value Undefined

```javascript
// constants.js — single source of truth
export const DEFAULT_FLAGS = { 'new-hero-section': false };

// App.jsx — explicit guard
const newHeroSection = flags.newHeroSection ?? DEFAULT_FLAGS['new-hero-section'];
```

Triggers when: the flag key does not exist in the environment, or client-side SDK availability is not enabled on the flag. Without the guard, undefined silently renders the safe default with no indication of cause. With the guard, a console warning identifies the exact issue and the fix required.

`DEFAULT_FLAGS` is defined once in `constants.js` and imported by both `main.jsx` and `App.jsx`. A single source of truth prevents the two values diverging silently if one is updated without the other.