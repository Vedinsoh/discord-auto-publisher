import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis, links } from 'lib/constants/index.js';

export async function chatInputFilterList(
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

  try {
    const response = await Data.API.Backend.getFilters(interaction.guildId, channel.id);

    if (!response.ok) {
      this.container.logger.error(
        `Failed to get filters: ${response.status} ${response.statusText}`
      );

      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Failed to retrieve filters. Please try again later.`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }

    const result = (await response.json()) as {
      success: boolean;
      message: string;
      data: { filters: Array<{ id: string; type: string; mode: string; value: string }> };
    };

    const filters = result.data.filters;

    if (!filters || filters.length === 0) {
      const noFiltersContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.info} No filters set for <#${channel.id}>.\\n\\n-# Use </ap filter add:${interaction.commandId}> to add a filter.`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [noFiltersContainer],
      });
    }

    const filterList = filters
      .map(f => `**${f.type}** (${f.mode})\\n└─ Value: \`${f.value}\`\\n└─ ID: \`${f.id}\``)
      .join('\\n\\n');

    const listContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `### Filters for <#${channel.id}> (${filters.length}/5):\\n\\n${filterList}\\n\\n-# Use </ap filter remove:${interaction.commandId}> to remove a filter.`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [listContainer],
    });
  } catch (error) {
    this.container.logger.error('Failed to get filters:', error);

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.crossmark} Failed to retrieve filters. Please try again later.`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
