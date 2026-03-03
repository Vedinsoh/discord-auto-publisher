import { DiscordMockup } from '@/components/marketing/discord-mockup';
import { FAQ } from '@/components/marketing/faq';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Premium } from '@/components/marketing/premium';
import { Stats } from '@/components/marketing/stats';

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <DiscordMockup />
      <HowItWorks />
      <FAQ />
      <Premium />
    </>
  );
}
