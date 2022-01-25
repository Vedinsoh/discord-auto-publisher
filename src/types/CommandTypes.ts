/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Collection, Message } from 'discord.js-light';

export type CommandType = (...args: [Message, ...any[]]) => any;

export type CommandsCollection = Collection<string, CommandType>;
