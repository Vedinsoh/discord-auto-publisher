import { Message } from 'discord.js-light';
import { AdminCommands } from '#types/CommandTypes';

export default class AdminCommand<Key extends keyof AdminCommands> {
  constructor(public name: Key, public run: (message: Message, ...args: AdminCommands[Key]) => void) {}
}
