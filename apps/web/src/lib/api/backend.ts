import 'server-only';

import type { Edition } from '@ap/api-types';
import { auth } from '@/lib/auth';

function getBackendUrl(edition: Edition): string {
  const envVar = edition === 'premium' ? 'PREMIUM_BACKEND_URL' : 'FREE_BACKEND_URL';
  const url = process.env[envVar];
  if (!url) {
    throw new Error(`${envVar} environment variable is not set`);
  }
  return url;
}

interface BackendFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export async function backendFetch<T>(
  edition: Edition,
  path: string,
  options?: BackendFetchOptions
): Promise<T> {
  const session = await auth();

  if (!session) {
    throw new BackendError(401, 'Not authenticated');
  }

  const token = await getDiscordAccessToken();

  if (!token) {
    throw new BackendError(401, 'No Discord access token');
  }

  const url = `${getBackendUrl(edition)}${path}`;

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
    throw new BackendError(response.status, body || response.statusText);
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
