import { FinalCta } from '@/components/marketing/final-cta';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Stats } from '@/components/marketing/stats';

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <HowItWorks showGuideCta />
      <FinalCta />
    </>
  );
}
