import type { ClientEvents } from 'discord.js';

class Event<Key extends keyof ClientEvents> {
  constructor(public name: Key, public run: (...args: ClientEvents[Key]) => void) {}
}

export default Event;
