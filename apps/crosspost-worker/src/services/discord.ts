import { createDiscordClient } from '@ap/discord-api';
import { env } from 'lib/config/env.js';
import { Logger } from './logger.js';

export const Discord = createDiscordClient(env.DISCORD_TOKEN, Logger);
