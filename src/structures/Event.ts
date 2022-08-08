/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientEvents } from 'discord.js';

export class Event<Key extends keyof ClientEvents> {
  constructor(public name: Key, public run: (...args: ClientEvents[Key]) => any) {}
}
