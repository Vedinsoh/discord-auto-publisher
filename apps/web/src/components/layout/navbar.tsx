'use client';

import { Menu, MessageCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { links } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

const scrollLinks = [
  { label: 'Home', sectionId: 'home' },
  { label: 'How It Works', sectionId: 'how-it-works' },
  { label: 'Premium', sectionId: 'premium' },
];

const routeLinks = [{ href: '/status', label: 'Status' }];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (pathname !== '/') {
      router.push('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-4">
            <Logo className="w-8 h-8" color="white" />
            <span className="text-white text-xl font-semibold">Auto Publisher</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {scrollLinks.map(link => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollToSection(link.sectionId)}
                className={cn(
                  'text-sm transition-colors',
                  pathname === '/' && link.sectionId === 'home'
                    ? 'text-blue-400'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                {link.label}
              </button>
            ))}
            {routeLinks.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  'text-sm transition-colors',
                  pathname === link.href ? 'text-blue-400' : 'text-slate-300 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-slate-800/50 hover:bg-slate-800 text-white border-slate-700"
              asChild
            >
              <Link href={links.discordSupportServer} target="_blank">
                <MessageCircle className="w-4 h-4 mr-2" />
                Support Server
              </Link>
            </Button>
            <Link
              href="/dashboard"
              className={cn(
                'hidden lg:block px-4 py-2.5 rounded-lg transition-all',
                pathname === '/dashboard'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              )}
            >
              Dashboard
            </Link>
            <Button
              className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 border-0"
              asChild
            >
              <Link href={links.discordBotInvite} target="_blank">
                Invite Bot
              </Link>
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
          <div className="px-4 py-4 space-y-3">
            {scrollLinks.map(link => (
              <button
                key={link.label}
                type="button"
                onClick={() => scrollToSection(link.sectionId)}
                className="block text-slate-300 hover:text-white transition-colors py-2 w-full text-left"
              >
                {link.label}
              </button>
            ))}
            {routeLinks.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  'block transition-colors py-2',
                  pathname === link.href ? 'text-blue-400' : 'text-slate-300 hover:text-white'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className={cn(
                'block transition-colors py-2',
                pathname === '/dashboard' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <div className="pt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full bg-slate-800/50 hover:bg-slate-800 text-white border-slate-700"
                asChild
              >
                <Link href={links.discordSupportServer} target="_blank">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Support Server
                </Link>
              </Button>
              <Button
                className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
                asChild
              >
                <Link href={links.discordBotInvite} target="_blank">
                  Invite Bot
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
