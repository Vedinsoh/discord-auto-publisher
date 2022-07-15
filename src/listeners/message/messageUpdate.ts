import { Constants, Message, PartialMessage } from 'discord.js-light';
import { Event } from '#structures/Event';
import crosspost from '#functions/crosspost';

export default new Event(
  Constants.Events.MESSAGE_UPDATE,
  async (_original: Message | PartialMessage, updated: Message | PartialMessage) => {
    if (!updated.flags.bitfield) crosspost(updated, { isUpdate: true });
  }
);
