'use client';

import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

interface AuthRedirectProps {
  callbackUrl: string;
}

export function AuthRedirect({ callbackUrl }: AuthRedirectProps) {
  useEffect(() => {
    // Prefer the live URL (incl. query, e.g. ?upgrade=year) so intent survives the
    // login round-trip; the prop is a same-origin fallback for the initial paint.
    const liveTarget = window.location.pathname + window.location.search;
    signIn('discord', { callbackUrl: liveTarget || callbackUrl });
  }, [callbackUrl]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  );
}
