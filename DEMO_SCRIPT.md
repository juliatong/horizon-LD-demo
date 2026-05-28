# Demo Script - Horizon Analytics / LaunchDarkly
## SA/SE- Julia Presentation

For technical setup, see [README.md](./README.md).
For deep architectural Q&A, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Before Walk In: Reading the Room

Fill this in before every meeting. Five minutes of stakeholder mapping changes the entire opening.

### Stakeholder Map Template

```
WHO IS IN THE ROOM?

Champion (wants this to happen):      ___________________
Economic buyer (signs the check):     ___________________
Technical evaluator:                  ___________________
Skeptic (most likely to say no):      ___________________
Absent but influential (CISO?):       ___________________

ADJUST YOUR OPENING:
  VP Eng present      -> open with the Friday night incident
  CTO present         -> open with the strategic framing
  CPO / VP Product    -> open with the PM data story
  Security present    -> address trust boundary proactively in minute one
  Economic buyer only -> ROI framing before the demo, not after
```

### Stakeholder Weight (who actually moves the deal)

**Series B / Scale-up (50-500 engineers) — LD's APJ sweet spot:**

```
1. VP of Engineering    40%  Champion and Budget Owner.

2. CTO                  x%   Strategic and platform sign-off required at scale.

3. VP of Product        y%   Ship velocity and data story.
                              Feature Experimentation section lands here.

4. Staff / Principal    z%   Technical veto power.
Engineer                      Can kill a deal with "we can build this."
                              Needs to be won technically, not commercially.

5. CISO                  e%   Blocker, rarely a champion.
                              One unanswered security question stalls months.
```


### The Champion's Two Sentences

My champion needs to sell this internally to people who never watched my demo. I will give them the words:

> "LaunchDarkly lets us ship features to specific users before full release, and kill any feature in seconds if something goes wrong. We estimate it eliminates one major incident rollback per quarter — which costs us [X hours engineering time] and [Y in customer impact] each time."

Fill in X and Y from the customer's own incident data if possible. If not, offer to help them estimate it.

---

## Opening Lines by Persona

Choose based on who is most senior in the room.

**VP of Engineering in the room:**
> "Picture your team on a Friday afternoon. They've just shipped a feature. 45 minutes after deploy, PagerDuty fires. The feature is broken in production. The rollback takes three hours, two engineers, and ruins someone's weekend. What if killing a broken feature took three seconds — and nobody needed to touch a deploy pipeline?"

**CTO in the room:**
> "..."

**VP of Product in the room:**
> "..."

**Security-conscious room:**
> "..."

---

## The Demo — Three Acts

### Setup State Before Starting

```
Flag:         targeting OFF
Experiment:   stopped
Browser:      localhost:5173 open, Sam selected in persona switcher
              -> Sam sees HeroOld (the "safe" baseline)
```

---

### Act 1: Release & Remediate
**Goal:** Show zero-deploy release, instant rollback, automated kill switch.
**Time:** 3 minutes.
**Primary audience:** VP of Engineering.

---

**Beat 1.1 — The safe baseline**

```
DO:    Show the browser. Sam is active. HeroOld is visible.
       "Welcome to Horizon Analytics. Powerful dashboards."

SAY:   "This is Horizon Analytics' current landing page.
        The new version — with AI Insights messaging — has
        already shipped to production. The code is live.
        But no user can see it yet. The feature is dark."

WHY:   Establishes the core concept: deploy != release.
       Code ships, feature doesn't.
```

---

**Beat 1.2 — The zero-deploy release**

```
DO:    Go to LD dashboard. Toggle ON, Change default rule to true. Save.
       Watch the browser WITHOUT refreshing.

SAY:   "I just turned on the flag. Watch the browser."
       [pause for the hero to swap]
       "No deploy. No CI pipeline. No engineer woke up
        for that. The feature went live in under a second
        to every user on the planet."

ANTICIPATED QUESTION:
  "How is that instant?"
  -> "The React SDK maintains a persistent SSE streaming
      connection to LaunchDarkly. When I changed the flag,
      LD pushed the new value over that stream. The app
      re-rendered. No polling, no reload."

WHY:   Wow moment 1. Let the silence land before moving on.
```

---

**Beat 1.3 — The instant rollback**

```
DO:    Change default rule back to false. Save.
       Watch the browser without refreshing.

SAY:   "Something's wrong. Users are reporting issues.
        That's the rollback. Under a second.
        No rollback deploy. No waiting for CI.
        The old experience is back."

ANTICIPATED QUESTION:
  "What about users mid-session when you rolled back?"
  -> "The stream update propagates to every connected
      client within milliseconds. In-flight sessions
      get the updated value on their next flag evaluation
      — typically the next page interaction."

WHY:   Wow moment 2. Establishes the speed of recovery.
```

---

**Beat 1.4 — The automated kill switch (Act 3 climax)**

```
DO:    Change default rule back to true (feature is live).
       Open terminal. Run:
         export LD_API_TOKEN=your-token
         export LD_ENV=test
         ./kill-feature.sh

SAY:   "It's 2am. PagerDuty fires. The on-call engineer
        gets the alert. In the old world, they wake up,
        find the bad commit, run a rollback through CI —
        40 minutes minimum. In this world:"
       [run the script]
       "One command. The feature is off. The engineer
        reads about it in the morning. That's not a
        rollback. That's an incident that never happened."

ANTICIPATED QUESTION:
  "Does that require a human to run the command?"
  -> "No — and that's the point. In production, this
      call is made by PagerDuty, Datadog, or your
      monitoring tool via a pre-configured webhook.
      The on-call engineer doesn't make a judgment call
      at 2am. The system already made it."

  "What about LaunchDarkly triggers?"
  -> "Triggers are the native LD version — a pre-baked
      webhook URL that requires no auth headers, no payload.
      One curl. I demonstrated the equivalent pattern here
      via the REST API since the trial doesn't include
      Enterprise triggers. In a production environment the
      call is even simpler."

WHY:   Wow moment 3. This is the VP Eng closer.
       Silence after the script runs. Let them see the
       browser revert before saying another word.
```

---

**Reset after Act 1:**

```bash
./enable-feature.sh
# Verify Sam sees HeroOld before starting Act 2
```

---

### Act 2: Target
**Goal:** Show controlled rollout — specific users get the feature, everyone else is protected.
**Time:** 3 minutes.
**Primary audience:** VP of Engineering + Staff Engineer.

---

**Beat 2.1 — Establish the context model**

```
DO:    Point to the persona switcher panel in the browser.
       Highlight the three rows of badges on each persona:
       USER / ACCOUNT / DEVICE

SAY:   "Before I show you targeting, notice the context
        model. Three independent kinds — user, account,
        device. The plan lives on the account, not the user.
        That matters. If Horizon Corp upgrades from free to
        enterprise, you update one account record and every
        user in that org instantly gets the enterprise
        experience. With a flat user model, you'd be
        updating thousands of records."

ANTICIPATED QUESTION (Staff Eng):
  "Why separate context kinds instead of flat attributes?"
  -> "It maps to how your data model actually changes.
      User attributes change when the person changes.
      Account attributes change when the org changes.
      Device attributes change when the session changes.
      They're independent axes. Mixing them creates
      a model that breaks under real operational load."

WHY:   Plants the data modeling insight early.
       Staff engineer will respect this.
```

---

**Beat 2.2 — Individual targeting (QA first)**

```
DO:    Click Jane (QA Engineer) in the persona switcher.
       HeroNew appears. Green badge: "Individual target (user context)"

SAY:   "Jane is on our internal QA team. She's individually
        targeted by user key. She always sees the new feature,
        regardless of any other rules. This is how you give
        your QA team permanent early access without writing
        a single line of conditional code."

WHY:   Simple, relatable. Everyone understands QA gets it first.
```

---

**Beat 2.3 — Account-level rule (enterprise APAC)**

```
DO:    Click Akira (Enterprise APAC).
       HeroNew appears. Green badge shows account rule.

SAY:   "Akira isn't individually targeted. His account —
        Horizon Corp — is on the enterprise plan in APAC.
        The rule evaluated his account context, not his
        user context. The plan lives on the organisation,
        not on the person."

WHY:   Demonstrates account context independently.
       Makes the data modeling point concrete.
```

---

**Beat 2.4 — The safety net (most important beat)**

```
DO:    Click Sam (Free NA).
       HeroOld appears. Green badge: "Default fallthrough -> false"

SAY:   "Sam is the most important persona in this demo.
        He matched no rules. He fell through to the default —
        and the default is false. He sees the old experience.
        That's 39,000 of your 40,000 daily visitors,
        safely on the current page while you validate
        with the other 1,000."

        [pause]

        "Anyone can show a feature turning on. The harder
        guarantee — the one that lets you sleep at night —
        is proving the untargeted users are safe.
        That's Sam."

WHY:   This is the VP Eng emotional closer for Act 2.
       Safety > features. Every engineering leader knows this.
```

---

**Beat 2.5 — Cross-context rule (staff engineer moment)**

```
DO:    Click Mei (Beta, Desktop).
       HeroNew appears. Green badge shows cross-context rule.

SAY:   "Mei is where it gets interesting. She's a beta
        tester — user.beta_tester is true. But she only
        gets the feature on desktop. Mobile is still being
        QA'd. The rule requires both conditions true
        simultaneously — a user attribute AND a device
        attribute. Watch what happens if she switches
        to mobile."

DO:    [Optionally] Change Mei's device_type to mobile in
        PersonaSwitcher.jsx and show her dropping to HeroOld.

SAY:   "Same user. Same beta opt-in. Different device.
        She falls through to default. Two context kinds
        evaluated simultaneously. That's something a flat
        user model can't cleanly express."

ANTICIPATED QUESTION (Staff Eng):
  "What if LD goes down mid-session?"
  -> "The SDK caches the last known flag values in both
      memory and localStorage. If LD is unreachable after
      initialisation, the app continues serving cached
      values. You can see them right now in DevTools ->
      Application -> Local Storage. The app doesn't break —
      it just stops receiving updates until the connection
      restores."

WHY:   This beat is for the staff engineer.
       Cross-context targeting is sophisticated.
       If they're in the room, this is where you win them.
```

---

### Act 3: Experiment (Extra Credit)
**Goal:** Show data-driven decision making layered on top of the targeting rollout.
**Time:** 2 minutes.
**Primary audience:** VP of Product / CPO. Strong supporting signal for VP Eng.

---

**Setup state before this act:**

```
Experiment: running
Switch to Sam (only persona on default rule = experiment audience)
```

---

**Beat 3.1 — The PM problem**

```
SAY:   "Your PM shipped this new hero section. Targeting
        rules are live — QA validated it, enterprise APAC
        users are seeing it. Now the PM asks: does it
        actually work? Do users engage more with the new
        version? LaunchDarkly answers that question without
        a separate analytics tool."

WHY:   Frames experimentation as a PM need, not a dev need.
       Gets the CPO leaning forward.
```

---

**Beat 3.2 — Show the experiment**

```
DO:    Open the LD dashboard -> Experiments -> Hero Section A/B Test
       Show the Results tab.

SAY:   "Same flag. Now an A/B test. The general population —
        users not covered by targeting rules — is split 50/50.
        Half see the new hero, half see the current one.
        Two metrics: CTA Click Rate as the intent signal,
        Trial Start Rate as the conversion signal.
        The PM can see live data while the targeted rollout
        is already happening."

ANTICIPATED QUESTION:
  "Why is only Sam in the experiment?"
  -> "Jane, Akira, and Mei are already committed to a
      variation via targeting rules. Running an experiment
      on pre-committed users would contaminate the results.
      The experiment measures the general population —
      the unbiased audience — before full rollout.
      That's correct experiment design, not a limitation."

  "You only have a few data points."
  -> "Statistical significance requires thousands of users.
      The goal here is to demonstrate the setup, event flow,
      and results UI. In production, this experiment would
      run against real traffic. The mechanism is identical."

WHY:   Closes the loop: targeting delivers the feature
       to the right people, experimentation validates
       whether it works before opening to everyone.
```

---

## Closing Statement

Choose based on the room.

**Universal closer:**
> "Ship code continuously. Release features deliberately. Kill mistakes instantly. Without touching a deploy pipeline. That's not a feature flag tool — that's a different way of shipping software."

**VP Eng closer (emphasise safety):**
> "The guarantee you're making to your board and your customers is that you can move fast without breaking things. LaunchDarkly is the infrastructure that makes that guarantee credible."

**CTO closer (emphasise strategy):**
> "The teams that adopt this architecture early don't just ship faster. They develop a fundamentally different relationship with risk. Features become reversible. Deploys become boring. That's a competitive advantage that compounds over time."

**VP Product closer (emphasise data):**
> "Every feature your team ships is a hypothesis. LaunchDarkly turns your production environment into a testing environment — without the risk of testing in production."

---

## Objection Handling Playbook

**"We already have feature flags in our CI/CD pipeline."**
> "Flags in CI/CD are deployment gates — they control what ships. LaunchDarkly controls what users see after it ships. Individual user targeting, rule-based rollouts, real-time kill switches, experimentation — these aren't deployment concerns. They're release concerns. Most teams need both."

**"We could build this ourselves."**
> "You could. Teams do. The question is whether that's the highest-value use of your engineering time. You'd be building targeting logic, a streaming update system, an experimentation platform, an audit trail, a dashboard for non-engineers to control flags without code changes — and maintaining it. LaunchDarkly is that platform, already built, with SLAs."

**"This adds a third-party dependency to our critical path."**
> "The SDK caches flag values locally and serves from cache if LD is unreachable. The SDK is not in your critical path — it's a read-aside layer. Your app functions with or without a live LD connection, using the last known flag state. I built that explicitly into this demo — there's a 5-second timeout and a safe default fallback in the initialisation code."

**"What data does LaunchDarkly see about our users?"**
> "That depends entirely on which SDK you use and what you put in your context. With the server-side SDK, LD sees zero end-user data — your server evaluates flags locally using a cached ruleset. With the client-side SDK, LD receives the context attributes you explicitly send. You control the shape of that context. No attributes you don't include are transmitted."

**"How does this scale cost-wise?"**
> "Server SDK billing is flat — seats and plan tier, regardless of user count. Client/mobile SDK billing is MAU-based — it scales linearly with your user base. At your current scale that's manageable. At 10x growth, the teams that planned for it have a server SDK layer that keeps costs flat. The billing model is the architecture — LD charges for what it sees and what it does."

**"Our CISO will have questions."**
> "I'd expect that. The right conversation is about trust boundaries and data residency. Server SDK — LD sees one server, never sees end users. Client SDK — context shape is your design decision. LD is SOC 2 Type II certified. Enterprise plans include data residency options. I'm happy to set up a separate session with your security team."

---

## Q&A Reference

Quick one-line answers for common technical questions. Full depth in [ARCHITECTURE.md](./ARCHITECTURE.md).

| Question | One-line answer |
|----------|----------------|
| Why client SDK? | Flag controls a visual change — no business consequence if inspected. Entitlements go server-side. |
| Why asyncWithLDProvider? | Blocks render until flags ready — zero flicker. Wrong for low-stakes flags, right for layout-defining ones. |
| Why multi-context? | User, account, device change independently. Flat model breaks when org upgrades plan or user switches device. |
| What if LD goes down? | SDK caches in memory and localStorage. App serves last known values. Visible right now in DevTools. |
| Why try/catch/finally on identify()? | Network blip without it leaves the panel frozen. Finally resets state whether call succeeds or fails. |
| Why experiment on default rule? | Pre-committed users (targeted) would contaminate results. Default rule is the unbiased general population. |
| What's the billing model? | Server SDK: flat. Client SDK: MAU. LD charges for what it sees — architecture determines the bill. |
