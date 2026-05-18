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

    // This is the default context (user) the app starts with.
    // In Part 2, we'll swap this dynamically using client.identify()
    // to demonstrate targeting different user segments.
    // context: {
    //   kind: 'user',
    //   key: 'user-default',
    //   name: 'Default User',
    //   // We'll add targeting attributes here in Part 2:
    //   // user_tier, region, beta_tester, etc.
    // },
    context: {
      kind: 'user',
      key: 'qa-jane',
      name: 'Jane (QA Engineer)',
      user_tier: 'internal',
      region: 'apac',
      beta_tester: true,
    }    
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
