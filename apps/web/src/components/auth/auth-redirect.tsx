'use client';

import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

interface AuthRedirectProps {
  callbackUrl: string;
}

export function AuthRedirect({ callbackUrl }: AuthRedirectProps) {
  useEffect(() => {
    signIn('discord', { callbackUrl });
  }, [callbackUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  );
}
