'use client';

import { ChevronDown, CreditCard, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SessionProvider, signIn, signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { links } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

const scrollLinks = [
  { label: 'How It Works', sectionId: 'how-it-works' },
  { label: 'Premium', sectionId: 'premium' },
];

const routeLinks = [
  { href: '/status', label: 'Status', external: false },
  { href: links.discordSupportServer, label: 'Join our server', external: true },
];

interface SessionUser {
  name?: string | null;
  username?: string | null;
  image?: string | null;
}

function displayNameOf(user: SessionUser): string {
  return user.name ?? user.username ?? 'Account';
}

function UserAvatar({ user, size = 32 }: { user: SessionUser; size?: number }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={size}
        height={size}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-600"
      style={{ width: size, height: size }}
    >
      <span className="text-white text-xs font-semibold">
        {displayNameOf(user).charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

const loginButtonClass =
  'bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 border-0';

function NavUserDesktop() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-9 w-28 rounded-md bg-slate-800/50 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Button
        className={loginButtonClass}
        onClick={() => signIn('discord', { redirectTo: '/dashboard' })}
      >
        Login with Discord
      </Button>
    );
  }

  const user = session.user;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-slate-800/50">
        <UserAvatar user={user} size={32} />
        <span className="max-w-[10rem] truncate text-sm text-white">{displayNameOf(user)}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <CreditCard className="h-4 w-4" />
          Subscriptions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => signOut({ redirectTo: '/' })}>
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavUserMobile({ onNavigate }: { onNavigate: () => void }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-11 w-full rounded-md bg-slate-800/50 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Button
        className={cn('w-full', loginButtonClass)}
        onClick={() => signIn('discord', { redirectTo: '/dashboard' })}
      >
        Login with Discord
      </Button>
    );
  }

  const user = session.user;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-1 py-2">
        <UserAvatar user={user} size={36} />
        <span className="truncate text-sm text-white">{displayNameOf(user)}</span>
      </div>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>
      <span className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600">
        <CreditCard className="h-4 w-4" />
        Subscriptions
      </span>
      <button
        type="button"
        onClick={() => signOut({ redirectTo: '/' })}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </div>
  );
}

function NavbarInner() {
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
          <div className="flex items-center gap-12">
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
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  {link.label}
                </button>
              ))}
              {routeLinks.map(link => (
                <Link
                  key={link.label}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  className={cn(
                    'text-sm transition-colors',
                    !link.external && pathname === link.href
                      ? 'text-blue-400'
                      : 'text-slate-300 hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <NavUserDesktop />
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
                target={link.external ? '_blank' : undefined}
                className={cn(
                  'block transition-colors py-2',
                  !link.external && pathname === link.href
                    ? 'text-blue-400'
                    : 'text-slate-300 hover:text-white'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4">
              <NavUserMobile onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  );
}

export function Navbar() {
  return (
    <SessionProvider>
      <NavbarInner />
    </SessionProvider>
  );
}
