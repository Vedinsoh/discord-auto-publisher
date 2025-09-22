import type { Collection } from 'discord.js';

export type CommandsCollection = Collection<CommandNames, (...args: unknown[]) => void>;

export enum CommandNames {
  INFO = 'info',
  PING = 'ping',
  RESPAWN = 'respawn',
  SHUTDOWN = 'shutdown',
  UPTIME = 'uptime',
}

export type Commands = {
  [CommandNames.INFO]: [];
  [CommandNames.PING]: [];
  [CommandNames.RESPAWN]: [];
  [CommandNames.SHUTDOWN]: [];
  [CommandNames.UPTIME]: [];
};
