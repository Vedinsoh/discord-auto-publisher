import type { Snowflake } from 'discord.js';
import { env } from '#utils/config';

// TODO improve parsing
const adminIds: Snowflake[] = env.BOT_ADMINS.split(/,\s*/g);

export const AdminCommands = {
  adminIds,
};
