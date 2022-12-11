import type { Message } from 'discord.js-light';
import type { Commands } from '#types/AdminCommandTypes';

class AdminCommand<Key extends keyof Commands> {
  constructor(public name: Key, public run: (message: Message, ...args: Commands[Key]) => void) {}
}

export default AdminCommand;
