'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useEffectEvent, useRef } from 'react';

/**
 * One-shot router.refresh() on the next window focus, armed by the returned
 * callback. Scoped to invite clicks because a refresh re-fetches the guild
 * list, which costs Discord `/users/@me/guilds` calls on the user's
 * rate-limited token — ordinary tab switches must not trigger it.
 */
export function useRefreshOnReturn(): () => void {
  const router = useRouter();
  const armedRef = useRef(false);

  const handleFocus = useEffectEvent(() => {
    if (!armedRef.current) return;
    armedRef.current = false;
    router.refresh();
  });

  useEffect(() => {
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return useCallback(() => {
    armedRef.current = true;
  }, []);
}
