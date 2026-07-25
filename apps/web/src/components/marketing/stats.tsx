'use client';

import { motion } from 'motion/react';
import { values } from '@/lib/constants';
import { formatNumber, formatNumberFull } from '@/lib/utils';

const stats = [
  { value: formatNumberFull(values.activeServers), label: 'Active Servers' },
  { value: formatNumber(values.messagesPublished), label: 'Messages Published' },
  { value: '99,9%', label: 'Uptime' },
];

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.5, ease: 'backIn' }}
        className="rounded-2xl border border-[rgba(120,150,255,.12)] bg-linear-to-b from-slate-900/90 to-slate-950/70 p-6"
      >
        <div className="grid grid-cols-1 divide-y divide-[rgba(120,150,255,.12)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {stats.map(stat => (
            <div key={stat.label} className="px-4 py-6 text-center md:py-2">
              <div className="bg-linear-to-r from-white to-blue-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                {stat.value}
              </div>
              <div className="mt-1 text-[13.5px] uppercase tracking-wider text-slate-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
