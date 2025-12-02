import { isPremiumEdition } from '@ap/utils';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis, links } from 'lib/constants/index.js';

export async function chatInputFilterAdd(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  if (!interaction.guildId) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} This command can only be used in a server.`)
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }

  if (isPremiumEdition() === false) {
    const premiumContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.warning} Filters are only available in **Premium** edition.\\n\\nUpgrade at [${links.hostname}](<${links.website}>) to unlock filters and other premium features!`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [premiumContainer],
    });
  }

  const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);
  const type = interaction.options.getString('type', true);
  const mode = interaction.options.getString('matching', true);
  const value = interaction.options.getString('value', true);

  try {
    const response = await Data.API.Backend.addFilter(interaction.guildId, channel.id, {
      type,
      mode,
      value,
    });

    if (!response.ok) {
      if (response.status === 400) {
        const limitContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.crossmark} Maximum 5 filters per channel. Remove a filter before adding a new one.`
          )
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [limitContainer],
        });
      }

      if (response.status === 404) {
        const notFoundContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.crossmark} Channel not enabled for auto-publishing. Enable it first with </ap enable:${interaction.commandId}>.`
          )
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [notFoundContainer],
        });
      }

      this.container.logger.error(
        `Failed to add filter: ${response.status} ${response.statusText}`
      );

      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`${emojis.crossmark} Failed to add filter. Please try again later.`)
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }

    const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.checkmark} Filter added to <#${channel.id}>!\\n\\n**Type:** ${type}\\n**Mode:** ${mode}\\n**Value:** \`${value}\``
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [successContainer],
    });
  } catch (error) {
    this.container.logger.error('Failed to add filter:', error);

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to add filter. Please try again later.`)
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
