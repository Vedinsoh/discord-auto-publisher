import type { Message as BaseMessage, DMChannel, PartialDMChannel } from 'discord.js';
import type { Commands } from '#types/AdminCommandTypes';

type Message = BaseMessage & { channel: DMChannel | PartialDMChannel };

class AdminCommand<Key extends keyof Commands> {
  constructor(
    public name: Key,
    public run: (message: Message, ...args: Commands[Key]) => void
  ) {}
}

export default AdminCommand;
