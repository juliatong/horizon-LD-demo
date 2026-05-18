import { useFlags } from 'launchdarkly-react-client-sdk';
import HeroOld from './HeroOld';
import HeroNew from './HeroNew';
import PersonaSwitcher from './PersonaSwitcher';

function App() {
  // useFlags() returns all flag values for the current context.
  // The SDK auto-converts flag keys to camelCase:
  // "new-hero-section" → newHeroSection
  const flags = useFlags();

  return (
    <div>
      {flags.newHeroSection ? <HeroNew /> : <HeroOld />}
      <PersonaSwitcher />
    </div>
  );
}

export default App;
