import { useState } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';

// ─────────────────────────────────────────────────────────
// PersonaSwitcher: Demo tool that simulates different users.
//
// Each persona carries three context kinds:
//
//   user    - the human (role, beta opt-in)
//             Targeting story: "QA team always sees it first"
//
//   account - the paying organization (plan, region)
//             Targeting story: "enterprise APAC accounts first"
//             Key insight: upgrading one account instantly
//             affects all users in it - no user record updates
//
//   device  - the machine (type: desktop | mobile)
//             Targeting story: "desktop before mobile -
//             different QA cycles, different risk profiles"
//
// Mei demonstrates cross-context targeting:
//   user.beta_tester = true AND device.type = desktop
//   Both conditions must be true simultaneously.
//   If she switches to mobile, she drops to default.
// ─────────────────────────────────────────────────────────

const PERSONAS = [
  {
    key: 'qa-jane',
    name: 'Jane (QA Engineer)',
    role: 'internal',
    beta_tester: true,
    account_key: 'acc-horizon-internal',
    account_name: 'Horizon Internal',
    account_plan: 'enterprise',
    account_region: 'apac',
    device_key: 'dev-desktop-jane',
    device_type: 'desktop',
    description: 'Internal QA - individual target, always sees new features',
    targeting_reason: 'Individual target (user context)',
  },
  {
    key: 'user-akira',
    name: 'Akira (Enterprise APAC)',
    role: 'member',
    beta_tester: false,
    account_key: 'acc-acme-corp',
    account_name: 'Acme Corp',
    account_plan: 'enterprise',
    account_region: 'apac',
    device_key: 'dev-desktop-akira',
    device_type: 'desktop',
    description: 'Enterprise customer in APAC - account-level rule match',
    targeting_reason: 'Rule: account.plan = enterprise + account.region = apac',
  },
  {
    key: 'user-sam',
    name: 'Sam (Free NA)',
    role: 'member',
    beta_tester: false,
    account_key: 'acc-sam-startup',
    account_name: "Sam's Startup",
    account_plan: 'free',
    account_region: 'na',
    device_key: 'dev-desktop-sam',
    device_type: 'desktop',
    description: 'Free-tier user - no rules match, sees default experience',
    targeting_reason: 'Default fallthrough -> false (the safety net)',
  },
  {
    key: 'user-mei',
    name: 'Mei (Beta, Desktop)',
    role: 'member',
    beta_tester: true,
    account_key: 'acc-global-tech',
    account_name: 'Global Tech EMEA',
    account_plan: 'enterprise',
    account_region: 'emea',
    device_key: 'dev-desktop-mei',
    device_type: 'desktop',
    description: 'Beta tester on desktop - cross-context rule match',
    targeting_reason: 'Rule: user.beta_tester = true AND device.type = desktop',
  },
];

function PersonaSwitcher() {
  const ldClient = useLDClient();
  const [activeKey, setActiveKey] = useState('qa-jane');
  const [switching, setSwitching] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState(null);

  async function handleSwitch(persona) {
    if (persona.key === activeKey || switching) return;

    setSwitching(true);
    setLoadingKey(persona.key);
    setError(null);

    try {
      // identify() tells LD: re-evaluate all flags for this new
      // multi-context. The SDK closes the current streaming connection
      // and opens a new one for all three context kinds simultaneously.
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

    } catch (err) {
      // identify() can fail if:
      //   - Network is unavailable during the switch
      //   - LD streaming connection drops mid-request
      //   - SDK key has been revoked
      //
      // Without this catch, switching stays true forever and the
      // persona panel freezes. With it, we surface the error and
      // reset state so the user can retry.
      console.error('[LaunchDarkly] identify() failed:', err);
      setError('Failed to switch persona. Check your connection and try again.');

    } finally {
      // Always reset switching and loadingKey - whether identify()
      // succeeded or failed. Without finally, a failure leaves the
      // panel permanently disabled and loadingKey stuck.
      setSwitching(false);
      setLoadingKey(null);
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>👤</span>
        <span>Switch Persona</span>
      </div>

      {/* Error state - visible feedback when identify() fails */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      {PERSONAS.map((persona) => {
        const isActive = persona.key === activeKey;
        const isLoading = persona.key === loadingKey;

        return (
          <button
            key={persona.key}
            onClick={() => handleSwitch(persona)}
            disabled={switching}
            style={{
              ...styles.personaButton,
              ...(isActive ? styles.active : {}),
              ...(isLoading ? styles.loading : {}),
              opacity: switching && !isActive && !isLoading ? 0.4 : 1,
            }}
          >
            {/* Persona name with loading spinner prefix */}
            <div style={styles.personaName}>
              {isLoading ? '⟳ ' : ''}{persona.name}
            </div>

            {/* Show "Switching..." during load, description otherwise */}
            <div style={styles.personaDesc}>
              {isLoading ? 'Switching...' : persona.description}
            </div>

            {/* Context kind badges - hidden during loading for clarity */}
            {!isLoading && (
              <>
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
              </>
            )}

            {/* Targeting reason - only on active, non-loading persona */}
            {isActive && !isLoading && (
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
  errorBanner: {
    padding: '8px 12px',
    marginBottom: '12px',
    backgroundColor: 'rgba(255, 80, 80, 0.15)',
    border: '1px solid rgba(255, 80, 80, 0.3)',
    borderRadius: '6px',
    color: '#ff8080',
    fontSize: '0.75rem',
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
    transition: 'border-color 0.2s, background-color 0.2s',
  },
  active: {
    border: '1px solid #00c896',
    backgroundColor: '#1e3a3a',
  },
  loading: {
    border: '1px solid #4a9eff',
    backgroundColor: '#1a2a3a',
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
