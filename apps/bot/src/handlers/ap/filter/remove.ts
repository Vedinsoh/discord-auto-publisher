import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis, links } from 'lib/constants/index.js';

export async function chatInputFilterRemove(
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

  if (process.env.APP_EDITION !== 'premium') {
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
  const filterId = interaction.options.getString('filter_id', true);

  try {
    const response = await Data.API.Backend.removeFilter(interaction.guildId, channel.id, filterId);

    if (!response.ok) {
      this.container.logger.error(
        `Failed to remove filter: ${response.status} ${response.statusText}`
      );

      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Failed to remove filter. Please try again later.`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }

    const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.checkmark} Filter removed from <#${channel.id}>!`)
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [successContainer],
    });
  } catch (error) {
    this.container.logger.error('Failed to remove filter:', error);

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to remove filter. Please try again later.`)
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
