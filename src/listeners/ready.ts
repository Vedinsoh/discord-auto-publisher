import { Event } from '#structures/Event';
import Blacklist from '#modules/BlacklistManager';

export default new Event('ready', () => {
  Blacklist.startupCheck();
});
