import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { type DMChannel, Events, type GuildChannel } from 'discord.js';
import { Services } from 'services/index.js';

@ApplyOptions<Listener.Options>({
  event: Events.ChannelDelete,
})
export class ChannelDeleteListener extends Listener {
  public async run(receivedChannel: DMChannel | GuildChannel) {
    // Get the channel data
    const channel = await Services.Channel.fetchNewsChannel(receivedChannel);
    if (!channel) return;

    this.container.logger.info(`Channel deleted: ${channel.id} in guild ${channel.guildId}`);

    // Delete channel from DB & cache
    await Services.Channel.remove(channel.guildId, channel.id);
  }
}
