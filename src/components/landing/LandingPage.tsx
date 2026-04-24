import { useState } from 'react';
import Hero from './Hero';
import Features from './Features';
import HowItWorks from './HowItWorks';
import Pricing from './Pricing';
import Footer from './Footer';
import WaitlistModal from './WaitlistModal';

interface LandingPageProps {
  onGetStarted: () => void;
  waitlistMode?: boolean;
}

export default function LandingPage({ onGetStarted, waitlistMode = false }: LandingPageProps) {
  const [showWaitlist, setShowWaitlist] = useState(false);

  const handleCTA = waitlistMode ? () => setShowWaitlist(true) : onGetStarted;

  return (
    <div className="bg-slate-950 min-h-screen text-white">
      {showWaitlist && <WaitlistModal onClose={() => setShowWaitlist(false)} />}
      <Hero onGetStarted={handleCTA} waitlistMode={waitlistMode} />
      <Features />
      <HowItWorks />
      <Pricing onGetStarted={handleCTA} waitlistMode={waitlistMode} />
      <Footer />
    </div>
  );
}
