import { env } from '@ap/config';
import { REST } from '@discordjs/rest';
import { type APIUser, Routes } from 'discord-api-types/v10';

const rest = new REST({
  api: 'http://proxy:8080/api',
}).setToken(env.DISCORD_TOKEN);

const USERNAME_CACHE_TTL_MS = 60 * 60 * 1000;
const usernameCache = new Map<string, { username: string; expiresAt: number }>();

/**
 * Display name of a Discord user, resolved through the proxy and cached
 * in-memory for 1h (backend is single-instance; one lookup per premium guild).
 * Failures are not cached — returns null so callers fall back to the raw ID.
 */
const getUsername = async (userId: string): Promise<string | null> => {
  const cached = usernameCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.username;

  try {
    const user = (await rest.get(Routes.user(userId))) as APIUser;
    const username = user.global_name ?? user.username;
    usernameCache.set(userId, { username, expiresAt: Date.now() + USERNAME_CACHE_TTL_MS });
    return username;
  } catch {
    return null;
  }
};

export const Discord = { rest, getUsername };
