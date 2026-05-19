import React from 'react';
import ReactDOM from 'react-dom/client';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import App from './App';
import './index.css';

// ─────────────────────────────────────────────────────────
// LaunchDarkly Setup
// ─────────────────────────────────────────────────────────
// Replace the VITE_LD_CLIENT_SIDE_ID value in your .env file
// with your LaunchDarkly client-side ID.
// Find it at: LD Dashboard → Project Settings → Environments → Client-side ID
// ─────────────────────────────────────────────────────────

async function render() {
  // asyncWithLDProvider initializes the SDK and waits for flag values
  // before rendering the app. This prevents a flash of default content.
  const LDProvider = await asyncWithLDProvider({
    clientSideID: import.meta.env.VITE_LD_CLIENT_SIDE_ID,

    // Multi-context: each kind represents an independent entity
    // in the customer's data model.
    //
    // user    → the human (role, beta opt-in)
    // account → the paying organization (plan, region)
    // device  → the machine they're on (type)
    //
    // Separating these means a plan upgrade at the account level
    // instantly affects all users in that account — without
    // updating individual user records. This maps directly to
    // how enterprise B2B SaaS manages entitlements.
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
