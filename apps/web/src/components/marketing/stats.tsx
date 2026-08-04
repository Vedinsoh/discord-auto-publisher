'use client';

import { motion } from 'motion/react';
import { values } from '@/lib/constants';
import { formatNumberFull } from '@/lib/utils';

/**
 * One social-proof line, and only the server count, because a quantified claim has to be
 * one we can evidence: the substantiation burden sits on the trader under UCPD Art 6,
 * and Discord's developer terms separately prohibit misrepresenting the app. Nothing
 * here measures uptime or counts published messages, so neither can be claimed — an
 * uptime figure would also contradict the Terms' disclaimer of any service level.
 */
export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.5, ease: 'backIn' }}
        className="text-center text-sm uppercase tracking-wider text-slate-400"
      >
        Trusted by{' '}
        <span className="bg-linear-to-r from-white to-blue-300 bg-clip-text font-semibold text-transparent">
          {formatNumberFull(values.activeServers)}+
        </span>{' '}
        servers
      </motion.p>
    </section>
  );
}
