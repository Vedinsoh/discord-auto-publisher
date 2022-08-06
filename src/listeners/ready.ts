import { Constants } from 'discord.js-light';
import Blacklist from '#modules/BlacklistManager';
import { Event } from '#structures/Event';

export default new Event(Constants.Events.CLIENT_READY, () => {
  Blacklist.startupCheck();
});
