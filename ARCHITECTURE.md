# Architecture Decisions - Horizon Analytics / LaunchDarkly Demo

Technical depth reference for the Meridian Digital LaunchDarkly SE exercise.
For setup and operations, see [README.md](./README.md).
For the pitch narrative and stakeholder strategy, see [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

---

## Decision 1: SDK Type — Where Does the Trust Boundary Sit?

This is a product and security decision, not a technical preference.

### The Core Question

> If your flag rules were visible to a competitor, would that damage your business?

```
YES -> Server SDK. Rules stay inside your infrastructure.
NO  -> Client/mobile SDK is acceptable for this use case.
```

### Comparison

| | Server SDK | Client / Mobile SDK |
|--|------------|---------------------|
| **Evaluation** | On your backend — full ruleset cached locally | On LD's servers — results only sent to device |
| **LD visibility** | None — LD never sees your end users | Full — every user is a direct LD connection |
| **SSE streams** | 1 stream regardless of user count | 1 stream per connected user |
| **Business logic** | Never leaves your infrastructure | Evaluated outside your infrastructure |
| **Billing** | Flat — seats and plan tier | MAU — grows linearly with user base |
| **Resilience** | Highest — LD not in request path | Moderate — LD is in the critical path |
| **Use when** | Flag rules reveal competitive or strategic intent | Flags must reach browser or device directly |

### The Exploit This Difference Enables

With client-side SDK, every flag value is visible in DevTools. A motivated user can:

```
1. Open DevTools -> Network tab
2. See flag values returned to the browser
3. Identify a flag like "premium-dashboard-access"
4. Write a browser extension that intercepts the LD
   response and changes false -> true
5. Access the premium feature without paying
```

This is not theoretical. It is how client-side entitlement gates get bypassed.

### This Demo's Justified Choice

This demo uses the client-side React SDK because:

```
1. The flag controls a visual UI change (hero section)
   No entitlement enforced. No business consequence if bypassed.

2. Real-time visual feedback is required for demo impact
   The "wow moment" only works with a streaming connection
   direct to the browser.

3. Server-side SDK cannot do browser streaming without
   a custom WebSocket or SSE layer you write yourself.
```

In production: entitlements, pricing gates, and access control belong server-side. Visual feature flags and UI experiments are appropriate for client-side.

---

## Decision 2: Initialisation Strategy — Correctness First or Speed First?

This is a product and risk decision about what users see in the 100-300ms gap between page load and LaunchDarkly responding.

### The Core Question

> If a user sees the wrong version of this UI for 200ms, does it matter?

```
YES -> asyncWithLDProvider (block render until flags ready)
NO  -> withLDProvider (render immediately, correct later)
```

### Comparison

| | `withLDProvider` — speed first | `asyncWithLDProvider` — correctness first |
|--|--------------------------------|-------------------------------------------|
| **Renders at** | 0ms — immediately | 150-300ms — after LD responds |
| **Flag values at first render** | Wrong (defaults) | Correct |
| **On LD response** | Re-renders — flicker visible | Single render — zero flicker |
| **Risk** | Layout shift, mis-clicks, trust erosion | Blank screen if LD is slow or down |
| **Use when** | Defaults are safe for a brief moment | Wrong values at render cause real harm |
| **Suitable for** | Non-critical UI, low-stakes flags | Pricing, auth gates, layout-defining flags |

### The Naming Trap

`asyncWithLDProvider` is the **blocking** option. The naming describes its JavaScript return type (a Promise), not its rendering behaviour. The `await` keyword is what creates the block.

```javascript
// This BLOCKS render until SDK is ready:
const LDProvider = await asyncWithLDProvider({...})

// This renders IMMEDIATELY (SDK catches up later):
<LDProvider clientSideID={key} context={ctx}>
```

`withLDProvider` initializes at `componentDidMount` — the app is already rendered before the SDK connects.

### This Demo's Justified Choice

`asyncWithLDProvider` with `await` — because this flag controls a layout-defining hero section. A visible flicker from old to new hero on a VP of Engineering's screen during a live demo would undermine the credibility of the demonstration. Correctness wins over speed.

In production with a loading state already present (auth check, data fetch), `withLDProvider` is acceptable — the existing spinner masks the flag evaluation latency.

### Timeout Safeguard

```javascript
timeout: 5   // seconds
```

Without a timeout, `asyncWithLDProvider` hangs indefinitely if LD is unreachable — the user sees a blank screen. The timeout fires after 5 seconds and falls back to `DEFAULT_FLAGS`. The app renders safely with the conservative default (old hero) rather than hanging.

Recommended production range: 100-500ms for client-side SDKs. This demo uses 5 seconds for demo reliability over a potentially slow network.

---

## Decision 3: Bootstrap Pattern — Eliminating the Tradeoff

Bootstrap answers a specific dissatisfaction: neither `withLDProvider` nor `asyncWithLDProvider` is good enough. It eliminates the correctness-versus-speed tradeoff entirely.

### The Goal

Arrive already knowing the correct flag values before serving the first request. Zero gap. Zero flicker. Zero render delay.

### Two Mechanisms

| | Client SDK — HTML embedding | Server SDK — in-process cache |
|--|----------------------------|-----------------------------|
| **Goal** | Browser arrives knowing values before JS runs | Server has rules before first request arrives |
| **Mechanism** | Server injects `window.__LD_BOOTSTRAP__` into HTML | LD ruleset persisted to Redis / Memcached / disk |
| **Who evaluates** | Your server (using server SDK cache) | Your server reads cache on startup |
| **Live updates** | Client SDK SSE connects in background after render | SSE stream syncs rule changes in background |
| **Requires** | Server rendering (Next.js, Rails, Django, Laravel) | Redis or Memcached alongside your server |
| **Not for** | Pure SPA served from CDN | Auto-scaling without persistent cache layer |

### Why This Demo Doesn't Use Bootstrap

This demo is a client-side React SPA served from Vite's dev server — no server rendering layer. Bootstrap requires server rendering to inject flag values into HTML before delivery. Not applicable to this stack.

For a production Next.js landing page with 40,000 daily visitors, bootstrap would be the correct architecture: server evaluates flags server-side, injects them into the HTML, client renders with zero gap.

---

## Decision 4: Multi-Context Model — Independent Axes of Targeting

### The Core Problem With Flat Contexts

```
SCENARIO: Acme Corp upgrades from free to enterprise.

FLAT USER MODEL:
  Update plan attribute on every user record
  -> N database writes
  -> Risk of inconsistency during update window
  -> Some users see old plan during transition

ACCOUNT CONTEXT:
  Update one account record
  -> All users in that account instantly see enterprise
  -> Zero propagation lag
  -> Zero inconsistency
```

### The Three Context Kinds in This Demo

```
user    -> the human
           Changes: name, email, role, beta opt-in
           Key: stable even if email changes
           Targeting story: "QA team always sees it first"

account -> the paying organization
           Changes: plan, region, contract tier
           Critical: plan lives HERE, not on user
           Targeting story: "enterprise APAC accounts first"
           Billing implication: server SDK flat regardless
                                of how many users per account

device  -> the machine
           Changes: per session or per physical device
           Targeting story: "desktop before mobile —
                             different QA cycles"
           Note: keys in this demo are stable per persona
                 for demo repeatability. In production,
                 device keys would be generated per physical
                 device and persisted in localStorage.
```

### The Cross-Context Rule — Why It Matters

Rule 2 in this demo:

```
user.beta_tester = true AND device.type = desktop -> true
```

This rule cannot be cleanly expressed with a flat user model. It evaluates two independently-changing dimensions simultaneously. When Mei switches from desktop to mobile, her `user.beta_tester` is unchanged but the rule fails — because the device context changed independently.

This maps directly to a real production scenario: rolling out a new feature to opted-in users, but only after mobile QA is complete. The device context is the gating mechanism that doesn't require any user-level attribute changes.

### The Design Rule for Context Kinds

```
Ask: "Can this attribute change WITHOUT the other context kind changing?"

YES -> separate context kind
NO  -> same context kind

Examples:
  User email changes -> doesn't change org plan
  -> user and account are separate context kinds ✓

  User's beta_tester changes -> doesn't change their device
  -> user and device are separate context kinds ✓

  User's name changes -> their user key doesn't change
  -> both belong on user context ✓
```

---

## Decision 5: Error Handling Philosophy — Fail Closed, Not Open

Three failure modes handled deliberately. The principle throughout: when in doubt, show the safe existing experience rather than accidentally releasing an untested feature.

### Failure Mode 1: SDK Unreachable at Startup

```javascript
// asyncWithLDProvider with timeout + catch block
timeout: 5,           // don't hang on blank screen
flags: DEFAULT_FLAGS, // serve safe defaults on timeout

catch (error) {
  // bad SDK key, network failure before timeout
  // -> render app with defaults, don't crash
  LDProvider = ({ children }) => children;
}
```

Without this: blank screen indefinitely if LD is unreachable.
With this: app renders in under 5 seconds regardless of LD availability.

### Failure Mode 2: identify() Fails Mid-Session

```javascript
try {
  await ldClient.identify(newContext);
  setActiveKey(persona.key);
} catch (err) {
  setError('Failed to switch persona...');
} finally {
  setSwitching(false);   // <- critical: always reset
  setLoadingKey(null);   // <- always reset loading state
}
```

Without `finally`: a failed `identify()` leaves `switching = true` permanently. The persona panel freezes. Only a page reload recovers it.

With `finally`: state always resets whether the call succeeds or fails. The user sees an error banner and can retry.

### Failure Mode 3: Flag Value Undefined

```javascript
// Single source of truth: src/constants.js
export const DEFAULT_FLAGS = { 'new-hero-section': false };

// Guard in App.jsx
const newHeroSection = flags.newHeroSection ?? DEFAULT_FLAGS['new-hero-section'];

if (flags.newHeroSection === undefined) {
  console.warn('[LaunchDarkly] Flag "new-hero-section" is undefined...');
}
```

Triggers when: flag doesn't exist in the reviewer's account, or client-side SDK availability is not enabled on the flag.

Without guard: undefined flag silently renders HeroOld with no indication of why.
With guard: console warning names the exact cause and fix. Single source of truth in `constants.js` prevents DEFAULT_FLAGS diverging between `main.jsx` and `App.jsx`.

---

## Decision 6: Client-Side Context Verification

Context attributes in this demo are client-constructed. The browser builds the `identify()` call and sends it to LD without server verification.

### The Exploit

```
Free user opens DevTools
Finds the identify() call in source code
Changes account.plan from 'free' to 'enterprise'
LD evaluates the tampered context
Free user sees enterprise features
```

### When This Is Acceptable

The `new-hero-section` flag controls a visual UI change. A free user seeing the new hero section has zero business consequence. Client-side context is acceptable.

### When This Is Not Acceptable

Any flag that enforces a business rule — entitlements, pricing gates, access control — requires server-verified identity. Two production patterns:

```
Pattern 1: Server-side SDK evaluation
  Client never touches LD directly
  Server evaluates flags against verified attributes
  from your database (plan, role, permissions)
  Flag values never reach the browser

Pattern 2: Server-issued signed context
  Client authenticates with your server
  Server returns a signed JWT with verified attributes
  Client passes JWT to LD — LD verifies the signature
  Client cannot tamper with plan or role attributes
  Client still gets real-time SSE updates
```

The rule: if bypass has a business consequence, context must be server-verified.

---

## Architectural Insight: The Billing Model Is the Architecture

This is not a product decision. It is an observation about how deeply architecture determines commercial outcomes.

### Why the Billing Units Are Opposite

LaunchDarkly charges for exactly what it can see and what it does. Because the two SDK types are architecturally opposite, their billing units are opposite too.

```
Server SDK:
  LD ships rules to your server once and steps away.
  LD sees one server — never sees your end users.
  Cannot charge per user because it never sees them.
  -> Flat billing: seats and plan tier.

Client / Mobile SDK:
  LD evaluates for every user.
  LD maintains one SSE stream per connected user.
  MAU is the natural unit because every user
  is a direct LD workload.
  -> MAU billing: grows linearly with your user base.
```

### The Compounding Risk

```
Users         Server SDK cost       Client SDK cost
10,000        Flat — no change      10,000 MAU
500,000       Flat — no change      500,000 MAU
10,000,000    Flat — no change      10,000,000 MAU
```

At growth stage, client/mobile SDK MAU cost compounds faster than expected. Teams that understand this architect a server SDK layer early — not to save money today, but to retain cost control as scale compounds.

### The Strategic Implication

> The architecture decision and the commercial decision are the same decision. Understand this before you sign a contract.

---

## Migration Triggers: When to Move Between Patterns

| Trigger | Action |
|---------|--------|
| You add a flag that enforces an entitlement or paywall | Move that flag's evaluation to server-side SDK |
| MAU-based LD bill starts scaling uncomfortably | Add server SDK layer for high-traffic flag evaluation |
| You add server rendering (Next.js, Rails, etc.) | Bootstrap becomes available — eliminates correctness/speed tradeoff |
| You need to evaluate flags for a service-to-service call | Server SDK — no browser, no SSE, no MAU |
| Security review requires zero user data leaving infrastructure | Server SDK — LD sees your server, never your users |

---

## SDK Resilience and Caching

The LD React SDK caches flag values in both memory and localStorage automatically.

```
App starts    -> SDK connects to LD
              -> fetches flag values
              -> stores in memory (runtime cache)
              -> stores in localStorage (persistent cache)

LD goes down  -> streaming connection drops
              -> SDK detects disconnection
              -> continues serving cached values
              -> app keeps running normally

LD comes back -> SDK reconnects automatically
              -> fetches latest flag values
              -> resumes normal operation
```

Visible right now: DevTools -> Application -> Local Storage -> localhost:5173.
Key format: `ld:YOUR_CLIENT_ID:...` containing the current flag state.

Three layers of resilience in this demo:
1. localStorage cache for mid-session LD outages
2. 5-second timeout fallback for startup failures
3. `DEFAULT_FLAGS` in `constants.js` if no cached values exist
