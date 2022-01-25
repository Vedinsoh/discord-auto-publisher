import { Message, PartialMessage } from 'discord.js-light';
import { Event } from '#structures/Event';
import crosspost from '#functions/crosspost';

export default new Event(
  'messageUpdate',
  async (_original: Message | PartialMessage, updated: Message | PartialMessage) => {
    if (!updated.flags.bitfield) crosspost(updated as Message, true);
  }
);
