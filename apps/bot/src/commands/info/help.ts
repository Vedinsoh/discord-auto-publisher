import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ContainerBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { Buttons } from 'lib/components/buttons.js';
import { emojis } from 'lib/consts/index.js';
import { logger } from 'utils/logger.js';

@ApplyOptions<Command.Options>({
  description: 'Discover all the ways you can use Auto Publisher to manage your channels!',
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
    const apCommandId = await interaction.client.application.commands
      .fetch()
      .then(commands => commands.findKey(command => command.name === 'ap'))
      .catch(logger.error);

    const usageContainer = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay => textDisplay.setContent('**How to use the bot:**'))
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.greenCircle}  Use </ap enable:${apCommandId}> to enable auto-publishing in a channel.`
        )
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.redCircle}  Use </ap disable:${apCommandId}> to stop auto-publishing in a channel.`
        )
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.info}  Use </ap status:${apCommandId}> to check if auto-publishing is enabled.`
        )
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('Need additional help? Join the support server!')
          )
          .setButtonAccessory(Buttons.supportServer)
      );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [usageContainer],
    });
  }
}
