import { Check, Crown, HeadphonesIcon, type LucideIcon, Sparkles, Zap } from 'lucide-react';
import { values } from '@/lib/constants';
import { formatNumberFull } from '@/lib/utils';
import { Button } from '../ui/button';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    title: 'Priority Publishing',
    description: 'Your messages are published first with < 0.5s latency',
  },
  {
    icon: Sparkles,
    title: 'Advanced Automation',
    description: 'Custom scheduling, auto-reactions, and more',
  },
  {
    icon: Crown,
    title: 'Premium Badge',
    description: 'Show off your premium status in your server',
  },
  {
    icon: HeadphonesIcon,
    title: 'Priority Support',
    description: '24/7 dedicated support with faster response times',
  },
];

const benefits = [
  'Instant message publishing',
  'Advanced automation features',
  'Custom publish schedules',
  'Auto-reactions on published messages',
  'Detailed analytics dashboard',
  'Priority customer support',
  'Early access to new features',
  'Remove rate limits',
];

export function Premium() {
  return (
    <section id="premium" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
          <Crown className="w-4 h-4" />
          <span>Premium Features</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          Upgrade to Premium
        </h2>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
          Unlock powerful features and take your Discord announcements to the next level
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {features.map(feature => (
            <div
              key={feature.title}
              className="bg-slate-900/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-5 lg:p-6 text-center hover:border-blue-500/40 transition-all"
            >
              <div className="w-11 h-11 lg:w-12 lg:h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <feature.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <h3 className="text-white font-medium mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 blur-3xl" />

          <div className="relative bg-slate-900 border border-blue-500/30 rounded-2xl overflow-hidden">
            <div className="bg-linear-to-r from-blue-500 to-purple-600 px-6 py-3 text-center">
              <span className="text-white flex items-center justify-center gap-2 font-medium">
                <Crown className="w-5 h-5" />
                Premium Plan
              </span>
            </div>

            <div className="p-6 sm:p-8 lg:p-12">
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl lg:text-5xl font-bold text-white">$4.99</span>
                      <span className="text-slate-400">/month</span>
                    </div>
                    <p className="text-slate-400">per server</p>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 mb-6">
                    <p className="text-green-400 text-sm">
                      Or <span className="font-semibold">$3.99/month</span> billed yearly — save 20%
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-6 text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-0 mb-6"
                    asChild
                  >
                    <a href="/dashboard">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Upgrade to Premium
                    </a>
                  </Button>

                  <p className="text-slate-500 text-sm text-center">
                    Cancel anytime. No hidden fees.
                  </p>
                </div>

                <div>
                  <h3 className="text-white text-lg lg:text-xl font-semibold mb-6">
                    Everything included:
                  </h3>
                  <div className="space-y-3">
                    {benefits.map(benefit => (
                      <div key={benefit} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-blue-400" />
                        </div>
                        <span className="text-slate-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            Trusted by {formatNumberFull(values.activeServers)} servers - Secure payment via Stripe
          </p>
        </div>
      </div>
    </section>
  );
}
