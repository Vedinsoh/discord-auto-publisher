import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';

@ApplyOptions<Listener.Options>({
  once: true,
  event: Events.ClientReady,
})
export class ReadyListener extends Listener {
  public run() {
    this.container.client.cluster.triggerReady();
  }
}
