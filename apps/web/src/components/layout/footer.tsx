import { Github, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { links } from '@/lib/constants';
import { Logo } from './logo';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/status', label: 'Status' },
  { href: '#', label: 'Documentation' },
];

const supportLinks = [
  { href: links.discordSupportServer, label: 'Support Server' },
  { href: '#', label: 'Terms of Service' },
  { href: '#', label: 'Privacy Policy' },
  { href: '#', label: 'Contact' },
];

const socialLinks = [
  { href: links.githubRepo, icon: Github, label: 'GitHub' },
  { href: links.discordSupportServer, icon: MessageCircle, label: 'Discord' },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-4 mb-4">
              <Logo className="w-8 h-8" color="white" />
              <span className="text-white text-xl font-semibold">Auto Publisher</span>
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

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Auto Publisher. All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            {socialLinks.map(link => (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                aria-label={link.label}
              >
                <link.icon className="w-5 h-5 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
