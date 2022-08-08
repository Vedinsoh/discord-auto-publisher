import { Message } from 'discord.js-light';
import { Commands } from '#types/AdminCommandTypes';

export default class AdminCommand<Key extends keyof Commands> {
  constructor(public name: Key, public run: (message: Message, ...args: Commands[Key]) => void) {}
}
