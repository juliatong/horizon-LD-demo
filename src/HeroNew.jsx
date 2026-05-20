// ─────────────────────────────────────────────────────────
// HeroNew: The redesigned hero section — this is the "feature"
// controlled by the "new-hero-section" flag.
//
// In a real deployment, this ships with the code but stays hidden
// until the flag is turned on. No separate deploy needed to release.
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

function HeroNew() {
  const ldClient = useLDClient();

  function handleCtaClick() {
    // Primary metric: intent signal
    ldClient.track('cta-clicked');

    // Secondary metric: conversion signal
    // In production this fires after signup form submission,
    // not on button click. Here it demonstrates the pattern.
    ldClient.track('trial-started');

    console.log('[Experiment] Tracked cta-clicked + trial-started (new hero)');
  }

  return (
    <section style={styles.hero}>
      <span style={styles.badge}>✨ New</span>
      <h1 style={styles.heading}>Introducing Horizon AI Insights</h1>
      <p style={styles.subtitle}>
        Real-time anomaly detection and predictive analytics,
        powered by machine learning.
      </p>
      <button style={styles.cta} onClick={handleCtaClick}>
        Try AI Insights Free
      </button>
    </section>
  );
}

const styles = {
  hero: {
    padding: '80px 40px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
    color: '#ffffff',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    backgroundColor: 'rgba(0, 200, 150, 0.15)',
    color: '#00c896',
    borderRadius: '20px',
    marginBottom: '20px',
    border: '1px solid rgba(0, 200, 150, 0.3)',
  },
  heading: {
    fontSize: '2.5rem',
    marginBottom: '16px',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '32px',
    color: '#b0d0e0',
    maxWidth: '560px',
    lineHeight: 1.6,
  },
  cta: {
    padding: '14px 36px',
    fontSize: '1rem',
    fontWeight: 600,
    backgroundColor: '#00c896',
    color: '#0f2027',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default HeroNew;
