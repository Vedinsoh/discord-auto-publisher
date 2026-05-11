import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType, type DMChannel, Events, type NonThreadGuildBasedChannel } from 'discord.js';
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
    await Services.Permissions.refreshChannel(newChannel);
  }
}
