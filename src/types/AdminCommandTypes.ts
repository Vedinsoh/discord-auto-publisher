import type { Collection, Snowflake } from 'discord.js';

export type CommandsCollection = Collection<CommandNames, (...args: unknown[]) => void>;

export enum CommandNames {
  BLACKLIST = 'blacklist',
  CHECK = 'check',
  DEBUG = 'debug',
  MEM = 'mem',
  RESPAWN = 'respawn',
  SHUTDOWN = 'shutdown',
  UNBLACKLIST = 'unblacklist',
  UPTIME = 'uptime',
}

export interface Commands {
  [CommandNames.BLACKLIST]: [guildId?: Snowflake];
  [CommandNames.CHECK]: [guildId?: Snowflake];
  [CommandNames.DEBUG]: [value: string];
  [CommandNames.MEM]: [];
  [CommandNames.RESPAWN]: [];
  [CommandNames.SHUTDOWN]: [];
  [CommandNames.UNBLACKLIST]: [guildId?: Snowflake];
  [CommandNames.UPTIME]: [];
}
