import { Constants } from 'discord.js-light';
import { Event } from '#structures/Event';
import Blacklist from '#modules/BlacklistManager';

export default new Event(Constants.Events.CLIENT_READY, () => {
  Blacklist.startupCheck();
});
