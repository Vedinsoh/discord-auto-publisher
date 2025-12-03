import { REST } from '@discordjs/rest';
import { env } from 'lib/config/env.js';

const rest = new REST({
  api: 'http://discord-proxy:8080/api',
}).setToken(env.DISCORD_TOKEN);

export const Discord = { rest };
