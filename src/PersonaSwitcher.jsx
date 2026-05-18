import { useState } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';

// ─────────────────────────────────────────────────────────
// PersonaSwitcher: Demo tool that simulates different users.
//
// In a real app, context attributes come from your auth system
// or user database. Here we hardcode four personas to demonstrate
// how LaunchDarkly targeting rules evaluate different user segments.
//
// Each persona has attributes that map to targeting rules:
//   - user_tier:     controls rollout by customer segment
//   - region:        controls rollout by geography
//   - beta_tester:   controls rollout by opt-in status
// ─────────────────────────────────────────────────────────

const PERSONAS = [
  {
    key: 'qa-jane',
    name: 'Jane (QA Engineer)',
    user_tier: 'internal',
    region: 'apac',
    beta_tester: true,
    description: 'Internal QA — always sees new features',
  },
  {
    key: 'user-akira',
    name: 'Akira (Premium APAC)',
    user_tier: 'premium',
    region: 'apac',
    beta_tester: false,
    description: 'Premium customer in APAC region',
  },
  {
    key: 'user-sam',
    name: 'Sam (Free NA)',
    user_tier: 'free',
    region: 'na',
    beta_tester: false,
    description: 'Free-tier user — should see default experience',
  },
  {
    key: 'user-mei',
    name: 'Mei (Premium EMEA Beta)',
    user_tier: 'premium',
    region: 'emea',
    beta_tester: true,
    description: 'Premium EMEA user who opted into beta',
  },
];

function PersonaSwitcher() {
  const ldClient = useLDClient();
  const [activeKey, setActiveKey] = useState('qa-jane');
  const [switching, setSwitching] = useState(false);

  async function handleSwitch(persona) {
    if (persona.key === activeKey || switching) return;

    setSwitching(true);

    // identify() tells LaunchDarkly: "re-evaluate all flags for this new user."
    // The SDK opens a new streaming connection for this context,
    // fetches updated flag values, and useFlags() triggers a re-render.
    await ldClient.identify({
      kind: 'user',
      key: persona.key,
      name: persona.name,
      user_tier: persona.user_tier,
      region: persona.region,
      beta_tester: persona.beta_tester,
    });

    setActiveKey(persona.key);
    setSwitching(false);
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>👤</span>
        <span>Switch Persona</span>
      </div>
      {PERSONAS.map((persona) => {
        const isActive = persona.key === activeKey;
        return (
          <button
            key={persona.key}
            onClick={() => handleSwitch(persona)}
            disabled={switching}
            style={{
              ...styles.personaButton,
              ...(isActive ? styles.active : {}),
              opacity: switching && !isActive ? 0.5 : 1,
            }}
          >
            <div style={styles.personaName}>{persona.name}</div>
            <div style={styles.personaDesc}>{persona.description}</div>
            <div style={styles.attributes}>
              <span style={styles.tag}>{persona.user_tier}</span>
              <span style={styles.tag}>{persona.region}</span>
              {persona.beta_tester && <span style={styles.tagBeta}>beta</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  panel: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '280px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '12px',
    padding: '16px',
    zIndex: 1000,
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  header: {
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerIcon: {
    fontSize: '1rem',
  },
  personaButton: {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    marginBottom: '8px',
    backgroundColor: '#2a2a4a',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s',
  },
  active: {
    border: '1px solid #00c896',
    backgroundColor: '#1e3a3a',
  },
  personaName: {
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '2px',
  },
  personaDesc: {
    color: '#8888aa',
    fontSize: '0.75rem',
    marginBottom: '6px',
  },
  attributes: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  tag: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.65rem',
    fontWeight: 600,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#a0a0b8',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  tagBeta: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.65rem',
    fontWeight: 600,
    backgroundColor: 'rgba(0, 200, 150, 0.15)',
    color: '#00c896',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
};

export default PersonaSwitcher;
