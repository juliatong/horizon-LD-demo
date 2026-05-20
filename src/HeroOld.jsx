// ─────────────────────────────────────────────────────────
// HeroOld: The current landing page hero section.
// This is the "safe" default experience all users see
// when the feature flag is OFF.
//
// Two experiment metrics are tracked on CTA click:
//
//   cta-clicked   -> primary metric, intent signal
//                    "did the user engage with the CTA?"
//
//   trial-started -> secondary metric, conversion signal
//                    "did the user take the next step?"
//
// In production these would fire at different points
// in the user journey. Here they fire together to
// demonstrate the multi-metric experiment pattern.
// A PM would use cta-clicked as a leading indicator
// and trial-started as the true conversion measure.
// ─────────────────────────────────────────────────────────

import { useLDClient } from 'launchdarkly-react-client-sdk';

function HeroOld() {
  const ldClient = useLDClient();

  function handleCtaClick() {
    // Primary metric: intent signal
    ldClient.track('cta-clicked');

    // Secondary metric: conversion signal
    // In production this fires after signup form submission,
    // not on button click. Here it demonstrates the pattern.
    ldClient.track('trial-started');

    console.log('[Experiment] Tracked cta-clicked + trial-started (old hero)');
  }

  return (
    <section style={styles.hero}>
      <h1 style={styles.heading}>Welcome to Horizon Analytics</h1>
      <p style={styles.subtitle}>
        Powerful dashboards for data-driven teams.
      </p>
      <button style={styles.cta} onClick={handleCtaClick}>
        Get Started
      </button>
    </section>
  );
}

const styles = {
  hero: {
    padding: '80px 40px',
    textAlign: 'center',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: '2.5rem',
    marginBottom: '16px',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '32px',
    color: '#a0a0b8',
  },
  cta: {
    padding: '14px 36px',
    fontSize: '1rem',
    fontWeight: 600,
    backgroundColor: '#4a4a6a',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default HeroOld;
