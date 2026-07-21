import 'server-only';

import { auth } from '@/lib/auth';

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error('BACKEND_URL environment variable is not set');
  }
  return url;
}

interface BackendFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Machine-readable reason from the backend error body, when present */
    public code?: string
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

/**
 * A 401 from any backend call behind `createDiscordAuth` — the Discord OAuth
 * token embedded in the session has expired (or the session/token is missing),
 * even though the NextAuth session is still "valid". Reactive re-login handles
 * it (ADR 0010). Extends BackendError so existing `instanceof BackendError`
 * checks still see it (status 401); `requireGuildPermission` uses 403, so a 401
 * here is unambiguously dead auth, never insufficient-permission.
 */
export class AuthExpiredError extends BackendError {
  constructor(message = 'Discord authorization expired') {
    super(401, message);
    this.name = 'AuthExpiredError';
  }
}

/** Pulls the APIResponse `code`/`message` out of an error body (JSON or raw text) */
function parseErrorBody(body: string): { message?: string; code?: string } {
  try {
    const parsed = JSON.parse(body) as { message?: string; code?: string };
    return { message: parsed.message, code: parsed.code };
  } catch {
    return {};
  }
}

export async function backendFetch<T>(path: string, options?: BackendFetchOptions): Promise<T> {
  const session = await auth();

  if (!session) {
    throw new AuthExpiredError('Not authenticated');
  }

  const token = await getDiscordAccessToken();

  if (!token) {
    throw new AuthExpiredError('No Discord access token');
  }

  const url = `${getBackendUrl()}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const { message, code } = parseErrorBody(body);
    if (response.status === 401) {
      throw new AuthExpiredError(message || body || response.statusText);
    }
    throw new BackendError(response.status, message || body || response.statusText, code);
  }

  const json = await response.json();

  // Backend wraps responses in { status, data, message } (APIResponse format)
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

async function getDiscordAccessToken(): Promise<string | undefined> {
  const { decode } = await import('next-auth/jwt');
  const { cookies } = await import('next/headers');

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get('__Secure-authjs.session-token')?.value ??
    cookieStore.get('authjs.session-token')?.value;

  if (!sessionToken) return undefined;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return undefined;

  const decoded = await decode({
    token: sessionToken,
    secret,
    salt:
      cookieStore.get('__Secure-authjs.session-token') != null
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
  });

  return decoded?.accessToken as string | undefined;
}
