import { Constants } from 'discord.js-light';
import crosspost from '#functions/crosspost';
import { Event } from '#structures/Event';

export default new Event(Constants.Events.MESSAGE_UPDATE, async (_original, updated) => {
  if (!updated.flags.bitfield) crosspost(updated, { isUpdate: true });
});
