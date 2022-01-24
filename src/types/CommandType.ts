/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Message } from 'discord.js-light';

export type CommandType = (...args: [Message, ...any[]]) => any;
