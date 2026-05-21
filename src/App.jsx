import { useFlags } from 'launchdarkly-react-client-sdk';
import HeroOld from './HeroOld';
import HeroNew from './HeroNew';
import PersonaSwitcher from './PersonaSwitcher';
import { DEFAULT_FLAGS } from './constants';

function App() {
  const flags = useFlags();

  // Guard: if the flag is undefined, the SDK either has not connected
  // yet or the flag does not exist in the reviewer's LD account.
  // Falls back to DEFAULT_FLAGS from constants.js - single source of
  // truth shared with main.jsx. Changing the default in one place
  // changes it everywhere.
  //
  // In a production app this would also log to your observability
  // platform (Datadog, Sentry) so the team knows a flag is missing.
  const newHeroSection = flags.newHeroSection ?? DEFAULT_FLAGS['new-hero-section'];

  if (flags.newHeroSection === undefined) {
    console.warn(
      '[LaunchDarkly] Flag "new-hero-section" is undefined. ' +
      'Check that the flag exists in your LD account and that ' +
      '"Client-side SDK availability" is enabled in flag Settings. ' +
      'Rendering with default value: ' + DEFAULT_FLAGS['new-hero-section']
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
