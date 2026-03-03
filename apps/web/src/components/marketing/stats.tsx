'use client';

import { MessageSquare, Server, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { values } from '@/lib/constants';
import { formatNumber, formatNumberFull } from '@/lib/utils';

const stats = [
  {
    icon: Server,
    value: formatNumberFull(values.activeServers),
    label: 'Active Servers',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: MessageSquare,
    value: formatNumber(values.messagesPublished),
    label: 'Messages Published',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Zap,
    value: '<1s',
    label: 'Average Publish Time With Premium',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
];

export function Stats() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: 0.5 + index * 0.1,
              ease: 'backIn',
            }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 lg:p-8 text-center hover:border-slate-700 hover:-translate-y-1 transition-all"
          >
            <div
              className={`w-14 h-14 lg:w-16 lg:h-16 ${stat.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}
            >
              <stat.icon className={`w-7 h-7 lg:w-8 lg:h-8 ${stat.color}`} />
            </div>
            <div className={`text-3xl lg:text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
            <div className="text-slate-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
