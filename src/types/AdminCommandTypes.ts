import type { Collection, Snowflake } from 'discord.js';

export type CommandsCollection = Collection<CommandNames, (...args: unknown[]) => void>;

export enum CommandNames {
  BLACKLIST = 'blacklist',
  CHECK = 'check',
  DEBUG = 'debug',
  FLUSHRL = 'flushrl',
  RESPAWN = 'respawn',
  RLSIZE = 'rlsize',
  SHUTDOWN = 'shutdown',
  UNBLACKLIST = 'unblacklist',
  UPTIME = 'uptime',
}

export type Commands = {
  [CommandNames.BLACKLIST]: [guildId?: Snowflake];
  [CommandNames.CHECK]: [guildId?: Snowflake];
  [CommandNames.DEBUG]: [value: string];
  [CommandNames.FLUSHRL]: [];
  [CommandNames.RESPAWN]: [];
  [CommandNames.RLSIZE]: [];
  [CommandNames.SHUTDOWN]: [];
  [CommandNames.UNBLACKLIST]: [guildId?: Snowflake];
  [CommandNames.UPTIME]: [];
};
