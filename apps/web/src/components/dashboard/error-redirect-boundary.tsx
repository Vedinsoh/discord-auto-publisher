'use client';

import { useRouter } from 'next/navigation';
import { Component, type ReactNode, useEffect } from 'react';
import { AuthExpiredSignal } from '@/lib/api/auth-expired';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  /**
   * Rendered instead of `fallback` when the caught error is an AuthExpiredSignal
   * (dead Discord token), so the boundary can route to re-login rather than the
   * generic server-list redirect (ADR 0010). Omit to treat auth-expiry like any
   * other error (used by the badge boundary, which just renders null).
   */
  authFallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Minimal client error boundary. The guild-detail payload is streamed as a
 * promise consumed with `use()`; a rejection (botless/unauthorized guild, or a
 * transient backend error) throws at the consuming component, which this
 * catches. Key it by guildId so switching guilds resets a prior error.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    if (this.props.authFallback && this.state.error instanceof AuthExpiredSignal) {
      return this.props.authFallback;
    }
    return this.props.fallback;
  }
}

/**
 * Fallback that navigates to `path`. Mirrors the old server-side
 * `catch { redirect('/dashboard') }` for a guild whose detail read failed —
 * now client-side because the detail promise resolves in the browser.
 */
export function RedirectTo({ path, children }: { path: string; children?: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(path);
  }, [router, path]);
  return children ?? null;
}
