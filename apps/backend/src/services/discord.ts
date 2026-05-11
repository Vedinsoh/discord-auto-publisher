import { env } from '@ap/config';
import { REST } from '@discordjs/rest';

const rest = new REST({
  api: 'http://proxy:8080/api',
}).setToken(env.DISCORD_TOKEN);

export const Discord = { rest };
