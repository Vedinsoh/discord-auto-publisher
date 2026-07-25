import { Heart } from 'lucide-react';
import Link from 'next/link';
import { links } from '@/lib/constants';
import { Logo } from './logo';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/premium', label: 'Premium' },
  { href: links.githubRepo, label: 'GitHub' },
  // TODO: re-enable when the Status page is ready.
  // { href: '/status', label: 'Status' },
];

const supportLinks = [
  { href: links.discordSupportServer, label: 'Support Server' },
  { href: '#', label: 'Terms of Service' },
  { href: '#', label: 'Privacy Policy' },
  { href: '/migration', label: 'Migration Guide' },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Logo className="w-8 h-8" />
              <span className="text-white text-base font-semibold">Auto Publisher</span>
            </Link>
            <p className="text-slate-400 max-w-sm">
              The most reliable Discord bot for automatically publishing announcement channel
              messages. Trusted by thousands of servers worldwide.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Support</h4>
            <ul className="space-y-2">
              {supportLinks.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <p>
            Copyright &copy; 2020&ndash;{new Date().getFullYear()} PWN Ltd. All rights reserved.
          </p>

          <div className="flex items-center gap-1">
            Crafted with <Heart className="h-4 w-4" /> by{' '}
            <Link
              href={links.githubAuthor}
              target="_blank"
              className="text-blue-400 hover:text-blue-500 transition-colors"
            >
              Vedinsoh
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
