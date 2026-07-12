import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import {
  ChannelType,
  type DMChannel,
  Events,
  type NewsChannel,
  type NonThreadGuildBasedChannel,
} from 'discord.js';
import { Services } from 'services/index.js';

@ApplyOptions<Listener.Options>({
  event: Events.ChannelUpdate,
})
export class ChannelUpdateListener extends Listener {
  public async run(
    _oldChannel: DMChannel | NonThreadGuildBasedChannel,
    newChannel: DMChannel | NonThreadGuildBasedChannel
  ) {
    if (newChannel.type !== ChannelType.GuildAnnouncement) return;
    // The changed overwrites affect only this channel — incremental push.
    await Services.Permissions.syncChannels(newChannel.guild, [newChannel as NewsChannel], {
      full: false,
      clearBlocked: true,
    });
    // Premium + handover pending: the changed overwrites may unblock the swap
    await Services.Handover.pingIfPending(newChannel.guildId);
  }
}
