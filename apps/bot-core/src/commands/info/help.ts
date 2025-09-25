import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ContainerBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'See how to use the bot',
})
export class HelpCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder //
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setContexts([InteractionContextType.Guild])
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const usageContainer = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay => textDisplay.setContent('**How to use the bot:**'))
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          '• Use `/ap enable <channel>` to enable auto-publishing in a channel.'
        )
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          '• Use `/ap disable <channel>` to stop auto-publishing in a channel.'
        )
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          '• Use `/ap status <channel>` to check if auto-publishing is enabled.'
        )
      );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [usageContainer],
    });
  }
}
