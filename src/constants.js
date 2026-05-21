// ─────────────────────────────────────────────────────────
// constants.js
//
// Single source of truth for default flag values.
//
// These values are used in two places:
//   1. main.jsx - passed to asyncWithLDProvider as fallback
//      if SDK fails to initialize within timeout
//   2. App.jsx  - used as fallback if flag is undefined
//      (wrong SDK key, flag not created, client-side
//       SDK availability not enabled)
//
// Principle: fail closed, not open.
// Defaulting to false means the app renders the safe existing
// experience rather than accidentally releasing an untested feature.
// ─────────────────────────────────────────────────────────

export const DEFAULT_FLAGS = {
  'new-hero-section': false,
};
