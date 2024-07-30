import type { Collection } from 'discord.js';

export type CommandsCollection = Collection<CommandNames, (...args: unknown[]) => void>;

export enum CommandNames {
  INFO = 'info',
  PING = 'ping',
  QUEUE = 'queue',
  RESPAWN = 'respawn',
  SHUTDOWN = 'shutdown',
  UPTIME = 'uptime',
}

export type Commands = {
  [CommandNames.INFO]: [];
  [CommandNames.PING]: [];
  [CommandNames.QUEUE]: [];
  [CommandNames.RESPAWN]: [];
  [CommandNames.SHUTDOWN]: [];
  [CommandNames.UPTIME]: [];
};
