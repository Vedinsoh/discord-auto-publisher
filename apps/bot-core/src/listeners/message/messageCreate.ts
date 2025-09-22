import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType, Events, type Message } from 'discord.js';
import { Services } from 'services/index.js';

@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
})
export class MessageCreateListener extends Listener {
  public async run(message: Message) {
    // Get the channel data
    const channel = await Services.Channel.fetch(message.channel);
    if (!channel) return;

    // Announcement channel handler
    if (channel.type === ChannelType.GuildAnnouncement) {
      Services.Crosspost.handle(message, channel);
      return;
    }
  }
}
