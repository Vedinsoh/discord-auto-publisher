/**
 * Shared auth-expiry signalling, importable from BOTH server and client (no
 * 'server-only'/'use client' directive) — the streamed guild-detail promise is
 * mapped to a sentinel on the server and unwrapped on the client.
 *
 * A 401 from the backend means the embedded Discord OAuth token is dead while
 * the NextAuth session is still "valid"; the fix is to re-login. See ADR 0010.
 */

/**
 * Returned in place of guild-detail data when the Discord token has expired.
 * Errors thrown across the RSC boundary are sanitized (identity lost, only a
 * digest survives), so the streamed promise resolves to this serializable
 * sentinel instead of rejecting — client consumers branch on it.
 */
export const AUTH_EXPIRED = { authExpired: true } as const;
export type AuthExpiredSentinel = typeof AUTH_EXPIRED;

export function isAuthExpired(value: unknown): value is AuthExpiredSentinel {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { authExpired?: unknown }).authExpired === true
  );
}

/**
 * Thrown client-side by useGuild() when the streamed detail resolves to the
 * auth-expired sentinel, so the shell's error boundary can route to re-login
 * instead of the generic "guild unavailable" redirect. Thrown on the client, so
 * its identity is intact for the boundary's instanceof check.
 */
export class AuthExpiredSignal extends Error {
  constructor() {
    super('Discord authorization expired');
    this.name = 'AuthExpiredSignal';
  }
}
