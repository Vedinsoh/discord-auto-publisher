'use client';

import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { links, values } from '@/lib/constants';
import { formatNumberFull } from '@/lib/utils';
import { Button } from '../ui/button';

export function Hero() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const headlineWords = 'Automate Your Discord Announcements'.split(' ');

  return (
    <section
      id="home"
      className="relative mx-auto flex max-w-7xl flex-col items-center justify-center pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background blurs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </motion.div>

      <div className="text-center relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-8"
        >
          <Sparkles className="w-4 h-4" />
          <span>Trusted by {formatNumberFull(values.activeServers)} Discord servers</span>
        </motion.div>

        {/* Headline with word-by-word animation */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight">
          {headlineWords.map((word, index) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{
                duration: 0.2,
                delay: 0.05 + index * 0.05,
                ease: 'easeInOut',
              }}
              className="mr-2 inline-block"
            >
              {word}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{
              duration: 0.2,
              delay: 0.05 + headlineWords.length * 0.05,
              ease: 'easeInOut',
            }}
            className="inline-block text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-blue-600"
          >
            Easily
          </motion.span>
        </h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.4 }}
          className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto"
        >
          Auto Publisher automatically publishes messages in your announcement channels, ensuring
          your community never misses important updates.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="xl"
            className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-0 group hover:-translate-y-0.5"
            asChild
          >
            <Link href={links.discordBotInvite} target="_blank">
              Invite Bot
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="xl"
            className="bg-slate-800/50 hover:bg-slate-800 text-white px-8 py-4 rounded-lg border-slate-700 transition-all hover:-translate-y-0.5"
            onClick={() => scrollToSection('how-it-works')}
          >
            How It Works
          </Button>

          <Button
            variant="outline"
            size="xl"
            className="bg-slate-800/50 hover:bg-slate-800 text-blue-400 px-8 py-4 rounded-lg border-blue-500/30 transition-all hover:-translate-y-0.5"
            onClick={() => scrollToSection('premium')}
          >
            View Premium
          </Button>
        </motion.div>

        {/* Support link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.6 }}
          className="mt-8"
        >
          <Link
            href={links.discordSupportServer}
            target="_blank"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors group"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">Need help? Join our support server</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
