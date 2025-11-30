import { ApplyOptions } from '@sapphire/decorators';
import {
  type ChatInputCommandDeniedPayload,
  Events,
  Listener,
  type UserError,
} from '@sapphire/framework';
import { ContainerBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: Events.ChatInputCommandDenied,
})
export class CommandDeniedListener extends Listener {
  public run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(error.message)
    );

    interaction.reply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
