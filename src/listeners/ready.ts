import DJS from 'discord.js-light';
import client from '#client';
import Event from '#structures/Event';

const { Constants } = DJS;

export default new Event(Constants.Events.CLIENT_READY, async () => {
  await client.blacklist.startupCheck();
});
