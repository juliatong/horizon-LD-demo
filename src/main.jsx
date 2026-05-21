import React from 'react';
import ReactDOM from 'react-dom/client';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import App from './App';
import { DEFAULT_FLAGS } from './constants';
import './index.css';

// ─────────────────────────────────────────────────────────
// LaunchDarkly Setup
// ─────────────────────────────────────────────────────────
// REVIEWER: Replace VITE_LD_CLIENT_SIDE_ID in your .env file
// with your Client-side ID.
// Find it at: LD Dashboard -> Project Settings -> Environments
// ─────────────────────────────────────────────────────────

async function render() {
  let LDProvider;

  try {
    LDProvider = await asyncWithLDProvider({
      clientSideID: import.meta.env.VITE_LD_CLIENT_SIDE_ID,

      // timeout: if the SDK does not connect and return flag values
      // within 5 seconds, fall back to DEFAULT_FLAGS and render the app.
      // Without this, asyncWithLDProvider hangs indefinitely if LD
      // is unreachable - the user sees a blank screen forever.
      timeout: 5,

      // DEFAULT_FLAGS imported from constants.js - single source of truth.
      // Used here as SDK fallback and in App.jsx as undefined guard.
      flags: DEFAULT_FLAGS,

      // Multi-context: three independent context kinds.
      // See README - Architecture Decisions for why these are separated.
      context: {
        kind: 'multi',

        user: {
          key: 'user-default',
          name: 'Default User',
          role: 'member',
          beta_tester: false,
        },

        account: {
          key: 'acc-default',
          plan: 'free',
          region: 'na',
        },

        device: {
          key: 'dev-desktop-default',
          type: 'desktop',
        },
      },
    });
  } catch (error) {
    // If asyncWithLDProvider itself throws (invalid SDK key, network
    // failure before timeout), log the error and fall back to a
    // minimal provider that serves DEFAULT_FLAGS to all components.
    // The app remains functional - users see the safe default experience.
    console.error('[LaunchDarkly] Failed to initialize SDK:', error);
    console.warn('[LaunchDarkly] Rendering with default flag values:', DEFAULT_FLAGS);

    // Fallback: pass-through provider using default flags only.
    // Keeps the app functional without a live LD connection.
    LDProvider = ({ children }) => children;
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <LDProvider>
        <App />
      </LDProvider>
    </React.StrictMode>
  );
}

render();
