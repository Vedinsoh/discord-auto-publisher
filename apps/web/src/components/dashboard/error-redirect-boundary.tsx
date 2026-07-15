'use client';

import { useRouter } from 'next/navigation';
import { Component, type ReactNode, useEffect } from 'react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Minimal client error boundary. The guild-detail payload is streamed as a
 * promise consumed with `use()`; a rejection (botless/unauthorized guild, or a
 * transient backend error) throws at the consuming component, which this
 * catches. Key it by guildId so switching guilds resets a prior error.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
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
