/* eslint-disable no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { ClientEvents } from 'discord.js-light';

export class Event<Key extends keyof ClientEvents> {
  constructor(
    public name: Key,
    public run: (...args: ClientEvents[Key]) => any
  ) {}
}
