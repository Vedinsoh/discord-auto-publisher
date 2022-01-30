import { Collection, Message } from 'discord.js-light';

export type CommandType = (...args: [Message, ...string[]]) => void;

export type CommandsCollection = Collection<string, CommandType>;
