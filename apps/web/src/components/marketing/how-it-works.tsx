import { CheckCircle, type LucideIcon, Plus, Settings, Zap } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'blue' | 'purple' | 'cyan' | 'green';
}

const steps: Step[] = [
  {
    icon: Plus,
    title: 'Invite the Bot',
    description:
      'Add Auto Publisher to your Discord server with a single click. No complex setup required.',
    color: 'blue',
  },
  {
    icon: Settings,
    title: 'Configure Channels',
    description:
      'Run /help to select which announcement channels you want Auto Publisher to monitor and manage.',
    color: 'purple',
  },
  {
    icon: Zap,
    title: 'Post Your Message',
    description: 'Create your announcement in any designated channel as you normally would.',
    color: 'cyan',
  },
  {
    icon: CheckCircle,
    title: 'Auto-Publish',
    description:
      "Auto Publisher automatically publishes channel messages to all following servers. That's it!",
    color: 'green',
  },
];

const colorMap = {
  blue: {
    border: 'border-blue-500/30',
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/20',
  },
  purple: {
    border: 'border-purple-500/30',
    gradient: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/20',
  },
  cyan: {
    border: 'border-cyan-500/30',
    gradient: 'from-cyan-500 to-cyan-600',
    shadow: 'shadow-cyan-500/20',
  },
  green: {
    border: 'border-green-500/30',
    gradient: 'from-green-500 to-green-600',
    shadow: 'shadow-green-500/20',
  },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">How It Works</h2>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
          Getting started with Auto Publisher is simple. Follow these easy steps to automate your
          announcements.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {steps.map((step, index) => {
          const colors = colorMap[step.color];
          return (
            <div key={step.title} className="relative group">
              {/* Step number badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-linear-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 text-sm z-10 font-medium transition-all duration-150 group-hover:scale-110 group-hover:border-slate-600 group-hover:text-white">
                {index + 1}
              </div>

              {/* Main card */}
              <div
                className={`relative bg-slate-900/50 backdrop-blur-sm border ${colors.border} rounded-2xl p-6 h-full transition-all duration-200 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-${step.color}-500/10 group-hover:border-opacity-80 overflow-hidden`}
              >
                {/* Gradient glow effect on hover */}
                <div
                  className={`absolute inset-0 bg-linear-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-200 rounded-2xl`}
                />

                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out bg-linear-to-r from-transparent via-white/5 to-transparent skew-x-12" />

                {/* Icon container */}
                <div
                  className={`relative w-12 h-12 lg:w-14 lg:h-14 bg-linear-to-br ${colors.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg ${colors.shadow} transition-all duration-150 group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3`}
                >
                  <step.icon className="w-6 h-6 lg:w-7 lg:h-7 text-white transition-transform duration-150 group-hover:scale-110" />
                </div>

                {/* Content */}
                <h3 className="relative text-lg lg:text-xl font-semibold text-white mb-3 transition-colors duration-150 group-hover:text-white">
                  {step.title}
                </h3>
                <p className="relative text-slate-400 text-sm lg:text-base transition-colors duration-150 group-hover:text-slate-300">
                  {step.description}
                </p>
              </div>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-linear-to-r from-slate-700 to-transparent transition-all duration-150 group-hover:from-slate-500" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
