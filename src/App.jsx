import { useFlags } from 'launchdarkly-react-client-sdk';
import HeroOld from './HeroOld';
import HeroNew from './HeroNew';
import PersonaSwitcher from './PersonaSwitcher';

// defaultFlags is passed from main.jsx as a safety net.
// If the LD SDK failed to initialize, useFlags() returns an empty
// object - without this guard, the app would silently render HeroOld
// with no indication of why. With it, we're explicit about the fallback.
function App({ defaultFlags = { 'new-hero-section': false } }) {
  const flags = useFlags();

  // Guard: if the flag is undefined, the SDK either hasn't connected yet
  // or the flag doesn't exist in the reviewer's LD account.
  // Fall back to the safe default (false = old hero) rather than
  // crashing or rendering unpredictably.
  //
  // In a production app this would also log to your observability
  // platform (Datadog, Sentry) so the team knows a flag is missing.
  const newHeroSection = flags.newHeroSection ?? defaultFlags['new-hero-section'];

  if (flags.newHeroSection === undefined) {
    console.warn(
      '[LaunchDarkly] Flag "new-hero-section" is undefined. ' +
      'Check that the flag exists in your LD account and that ' +
      '"Client-side SDK availability" is enabled in flag Settings. ' +
      'Rendering with default value: ' + defaultFlags['new-hero-section']
    );
  }

  return (
    <div>
      {newHeroSection ? <HeroNew /> : <HeroOld />}
      <PersonaSwitcher />
    </div>
  );
}

export default App;