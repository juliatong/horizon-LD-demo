import { useState } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';

// ─────────────────────────────────────────────────────────
// PersonaSwitcher: Demo tool that simulates different users.
//
// Each persona carries three context kinds:
//
//   user    → the human (role, beta opt-in)
//             Targeting story: "QA team always sees it first"
//
//   account → the paying organization (plan, region)
//             Targeting story: "enterprise APAC accounts first"
//             Key insight: upgrading one account instantly
//             affects all users in it — no user record updates
//
//   device  → the machine (type: desktop | mobile)
//             Targeting story: "desktop before mobile —
//             different QA cycles, different risk profiles"
//
// Mei demonstrates cross-context targeting:
//   user.beta_tester = true AND device.type = desktop
//   Both conditions must be true simultaneously.
//   If she switches to mobile, she drops to default.
// ─────────────────────────────────────────────────────────

const PERSONAS = [
  {
    // USER CONTEXT
    key: 'qa-jane',
    name: 'Jane (QA Engineer)',
    role: 'internal',
    beta_tester: true,

    // ACCOUNT CONTEXT
    account_key: 'acc-horizon-internal',
    account_name: 'Horizon Internal',
    account_plan: 'enterprise',
    account_region: 'apac',

    // DEVICE CONTEXT
    device_key: 'dev-desktop-jane',
    device_type: 'desktop',

    description: 'Internal QA — individual target, always sees new features',
    targeting_reason: 'Individual target (user context)',
  },
  {
    // USER CONTEXT
    key: 'user-akira',
    name: 'Akira (Enterprise APAC)',
    role: 'member',
    beta_tester: false,

    // ACCOUNT CONTEXT
    account_key: 'acc-acme-corp',
    account_name: 'Acme Corp',
    account_plan: 'enterprise',
    account_region: 'apac',

    // DEVICE CONTEXT
    device_key: 'dev-desktop-akira',
    device_type: 'desktop',

    description: 'Enterprise customer in APAC — account-level rule match',
    targeting_reason: 'Rule: account.plan = enterprise + account.region = apac',
  },
  {
    // USER CONTEXT
    key: 'user-sam',
    name: 'Sam (Free NA)',
    role: 'member',
    beta_tester: false,

    // ACCOUNT CONTEXT
    account_key: 'acc-sam-startup',
    account_name: 'Sam\'s Startup',
    account_plan: 'free',
    account_region: 'na',

    // DEVICE CONTEXT
    device_key: 'dev-desktop-sam',
    device_type: 'desktop',

    description: 'Free-tier user — no rules match, sees default experience',
    targeting_reason: 'Default fallthrough → false (the safety net)',
  },
  {
    // USER CONTEXT
    key: 'user-mei',
    name: 'Mei (Beta, Desktop)',
    role: 'member',
    beta_tester: true,

    // ACCOUNT CONTEXT
    account_key: 'acc-global-tech',
    account_name: 'Global Tech EMEA',
    account_plan: 'enterprise',
    account_region: 'emea',

    // DEVICE CONTEXT — desktop triggers the cross-context rule
    // Change to 'mobile' to watch her drop to default
    device_key: 'dev-desktop-mei',
    device_type: 'desktop',

    description: 'Beta tester on desktop — cross-context rule match',
    targeting_reason: 'Rule: user.beta_tester = true AND device.type = desktop',
  },
];

function PersonaSwitcher() {
  const ldClient = useLDClient();
  const [activeKey, setActiveKey] = useState('qa-jane');
  const [switching, setSwitching] = useState(false);

  async function handleSwitch(persona) {
    if (persona.key === activeKey || switching) return;

    setSwitching(true);

    // identify() re-evaluates all flags for the new multi-context.
    // The SDK closes the current streaming connection and opens
    // a new one for this context — all three kinds simultaneously.
    await ldClient.identify({
      kind: 'multi',

      user: {
        key: persona.key,
        name: persona.name,
        role: persona.role,
        beta_tester: persona.beta_tester,
      },

      account: {
        key: persona.account_key,
        name: persona.account_name,
        plan: persona.account_plan,
        region: persona.account_region,
      },

      device: {
        key: persona.device_key,
        type: persona.device_type,
      },
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

            {/* Context kind badges */}
            <div style={styles.contextRow}>
              <span style={styles.contextLabel}>user</span>
              <span style={styles.tag}>{persona.role}</span>
              {persona.beta_tester && (
                <span style={styles.tagBeta}>beta</span>
              )}
            </div>
            <div style={styles.contextRow}>
              <span style={styles.contextLabel}>account</span>
              <span style={styles.tag}>{persona.account_plan}</span>
              <span style={styles.tag}>{persona.account_region}</span>
            </div>
            <div style={styles.contextRow}>
              <span style={styles.contextLabel}>device</span>
              <span style={styles.tag}>{persona.device_type}</span>
            </div>

            {isActive && (
              <div style={styles.reason}>{persona.targeting_reason}</div>
            )}
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
    width: '300px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '12px',
    padding: '16px',
    zIndex: 1000,
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    maxHeight: '90vh',
    overflowY: 'auto',
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
    marginBottom: '8px',
  },
  contextRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
    flexWrap: 'wrap',
  },
  contextLabel: {
    fontSize: '0.65rem',
    color: '#5555aa',
    fontWeight: 700,
    textTransform: 'uppercase',
    width: '48px',
    flexShrink: 0,
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
  reason: {
    marginTop: '8px',
    padding: '6px 8px',
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
    borderLeft: '2px solid #00c896',
    color: '#00c896',
    fontSize: '0.7rem',
    borderRadius: '0 4px 4px 0',
  },
};

export default PersonaSwitcher;
