import { DiscordMockup } from '@/components/marketing/discord-mockup';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { PricingTeaser } from '@/components/marketing/pricing-teaser';
import { Stats } from '@/components/marketing/stats';

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <DiscordMockup />
      <HowItWorks showGuideCta />
      <PricingTeaser />
    </>
  );
}
