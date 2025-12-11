import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ContainerBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { Buttons } from 'lib/components/buttons.js';
import { emojis } from 'lib/constants/index.js';
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

    const replyContainer = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay => textDisplay.setContent('### How to use the bot:'))
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
          `${emojis.info}  Use </ap status:${apCommandId}> to get status of a channel or list all enabled channels.`
        )
      );

    if (config.isPremiumInstance) {
      replyContainer
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.filter}  Use </ap filter add:${apCommandId}> to add a filter to a channel.`
          )
        )
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.filter}  Use </ap filter remove:${apCommandId}> to remove a filter from a channel.`
          )
        )
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.filter}  Use </ap filter view:${apCommandId}> to view all filters in a channel.`
          )
        )
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.filter}  Use </ap filter edit:${apCommandId}> to edit an existing filter in a channel.`
          )
        )
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.filter}  Use </ap filter mode:${apCommandId}> to set the filter mode for a channel.`
          )
        );
    }

    replyContainer
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
      components: [replyContainer],
    });
  }
}
