import { capitalize } from '@ap/utils';
import { type Filter, FilterMatchMode, FilterMode, FilterType } from '@ap/validations';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import {
  ActionRowBuilder,
  type ChannelType,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  type SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { emojis } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { handlePremiumCheck } from 'utils/interactions.js';
import { logger } from 'utils/logger.js';

export async function chatInputFilterView(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  // Check for premium instance
  if (await handlePremiumCheck(interaction, 'filtering')) return;

  // This is handled by the GuildOnly precondition
  if (!interaction.inGuild()) return;

  // Get option values
  const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

  try {
    const channelStatus = await Services.Channel.getStatus(channel.id);

    if (!channelStatus?.enabled) {
      const notEnabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Auto-publishing is not enabled in <#${channel.id}> channel.\n\n-# Use </ap enable:${interaction.commandId}> to enable auto-publishing in this channel.`
        )
      );

      await interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [notEnabledContainer],
      });
      return;
    }

    // Fetch filters from backend
    const filtersResponse = await Data.API.Backend.getFilters(channel.id);

    if (!filtersResponse.ok) {
      logger.error(
        `Failed to fetch filters: ${filtersResponse.status} ${filtersResponse.statusText}`
      );

      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Failed to fetch filters. Please try again later.`
        )
      );

      await interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
      return;
    }

    const filtersData = (await filtersResponse.json()) as {
      status: number;
      data: { filters: Filter[] };
      message: string;
    };

    const filters = filtersData.data.filters;

    if (filters.length === 0) {
      const noFiltersContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} No filters found for <#${channel.id}>.\n\n-# Use </ap filter add:${interaction.commandId}> to add a filter.`
        )
      );

      await interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [noFiltersContainer],
      });
      return;
    }

    // Build dropdown with filters
    const options: SelectMenuComponentOptionData[] = filters.map(filter => {
      const valuePreview =
        filter.values.length > 1
          ? `${filter.values[0]} (+${filter.values.length - 1} more)`
          : filter.values[0];

      return {
        emoji: filter.mode === FilterMode.Allow ? emojis.checkmark : emojis.crossmark,
        label: `${capitalize(filter.type)} -  ${capitalize(filter.mode)}`,
        description: valuePreview.substring(0, 100),
        value: filter.id,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_select')
      .setPlaceholder('Select a filter to view')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const filterMode = (channelStatus.filterMode as FilterMatchMode) || FilterMatchMode.Any;
    const modeDescription =
      filterMode === FilterMatchMode.Any
        ? 'Messages pass if **at least one** allow filter matches'
        : 'Messages pass only if **all** allow filters match';

    const selectContainer = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `**Filter mode:** ${filterMode === FilterMatchMode.Any ? 'Any (OR)' : 'All (AND)'}\n-# ${modeDescription}`
        )
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`Select a filter to view from <#${channel.id}>:`)
      );

    const reply = await interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [selectContainer, row],
    });

    // Wait for filter selection
    const selectCollector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id && i.customId === 'filter_select',
      time: 300_000, // 5 minutes
    });

    selectCollector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
      await selectInteraction.deferUpdate();

      const selectedFilterId = selectInteraction.values[0];
      const selectedFilter = filters.find(f => f.id === selectedFilterId);

      if (!selectedFilter) {
        const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`${emojis.crossmark} Filter not found. Please try again.`)
        );

        await selectInteraction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [errorContainer],
        });
        return;
      }

      // Format values for display
      const displayValues =
        selectedFilter.type === FilterType.Author || selectedFilter.type === FilterType.Mention
          ? selectedFilter.values.map(v => `<@${v}>`).join(', ')
          : selectedFilter.type === FilterType.Webhook
            ? selectedFilter.values.map(v => `\`${v}\``).join(', ')
            : selectedFilter.values.map(v => `\`${v}\``).join(', ');

      const valueCount =
        selectedFilter.values.length > 1 ? ` (${selectedFilter.values.length})` : '';

      // Show filter details
      const detailsContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `### Filter Details for <#${channel.id}>\n\n**Type:** ${capitalize(selectedFilter.type)}${valueCount}\n**Mode:** ${selectedFilter.mode === FilterMode.Allow ? emojis.checkmark : emojis.crossmark} ${capitalize(selectedFilter.mode)}\n**Values:** ${displayValues}\n\n-# Use </ap filter edit:${interaction.commandId}> to edit or </ap filter remove:${interaction.commandId}> to remove this filter.`
        )
      );

      await selectInteraction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [detailsContainer],
      });
    });

    selectCollector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`${emojis.crossmark} Filter selection timed out.`)
        );

        interaction
          .editReply({
            flags: [MessageFlags.IsComponentsV2],
            components: [timeoutContainer],
          })
          .catch(() => {});
      }
    });
  } catch (error) {
    logger.error(error, 'Failed to view filter');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to view filter. Please try again later.`)
    );

    await interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
