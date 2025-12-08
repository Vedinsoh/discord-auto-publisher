import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { type DMChannel, Events, type GuildChannel } from 'discord.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

@ApplyOptions<Listener.Options>({
  event: Events.ChannelDelete,
})
export class ChannelDeleteListener extends Listener {
  public async run(receivedChannel: DMChannel | GuildChannel) {
    // Get the channel data
    const channel = await Services.Channel.fetchNewsChannel(receivedChannel);
    if (!channel) return;

    logger.info(`Channel deleted: ${channel.id} in guild ${channel.guildId}`);

    // Disable channel in DB & cache
    await Services.Channel.disable(channel.id);
  }
}
