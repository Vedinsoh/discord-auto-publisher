import { capitalize } from '@ap/utils';
import type { Filter } from '@ap/validations';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChannelType,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { emojis } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { handlePremiumCheck } from 'utils/interactions.js';
import { logger } from 'utils/logger.js';

export async function chatInputFilterRemove(
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
      success: boolean;
      message: string;
      data: { filters: Filter[] };
      statusCode: number;
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
    const options = filters.map(filter => {
      const valuePreview =
        filter.values.length > 1
          ? `${filter.values[0]} (+${filter.values.length - 1} more)`
          : filter.values[0];

      return {
        emoji: filter.mode === 'allow' ? emojis.checkmark : emojis.crossmark,
        label: `${capitalize(filter.type)} -  ${capitalize(filter.mode)}`,
        description: valuePreview.substring(0, 100),
        value: filter.id,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_select')
      .setPlaceholder('Select a filter to remove')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const selectContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`Select a filter to remove from <#${channel.id}>:`)
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
        selectedFilter.type === 'author' || selectedFilter.type === 'mention'
          ? selectedFilter.values.map(v => `<@${v}>`).join(', ')
          : selectedFilter.type === 'webhook'
            ? selectedFilter.values.map(v => `\`${v}\``).join(', ')
            : selectedFilter.values.map(v => `\`${v}\``).join(', ');

      const valueCount =
        selectedFilter.values.length > 1 ? ` (${selectedFilter.values.length})` : '';

      // Show confirmation
      const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_remove_${selectedFilterId}`)
        .setLabel('Remove Filter')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_remove')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        cancelButton
      );

      const modeEmoji = selectedFilter.mode === 'allow' ? emojis.checkmark : emojis.crossmark;

      const confirmContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `Are you sure you want to remove this filter from <#${channel.id}>?\n\n**Type:** ${capitalize(selectedFilter.type)}${valueCount}\n**Mode:** ${modeEmoji} ${capitalize(selectedFilter.mode)}\n**Values:** ${displayValues}`
        )
      );

      await selectInteraction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [confirmContainer, buttonRow],
      });

      // Wait for confirmation
      const buttonCollector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i =>
          i.user.id === interaction.user.id &&
          (i.customId === `confirm_remove_${selectedFilterId}` || i.customId === 'cancel_remove'),
        time: 300_000, // 5 minutes
      });

      buttonCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        await buttonInteraction.deferUpdate();

        if (buttonInteraction.customId === 'cancel_remove') {
          const cancelContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(`${emojis.crossmark} Filter removal cancelled.`)
          );

          await buttonInteraction.editReply({
            flags: [MessageFlags.IsComponentsV2],
            components: [cancelContainer],
          });
          return;
        }

        // Remove the filter
        const removeResponse = await Data.API.Backend.removeFilter(channel.id, selectedFilterId);

        if (!removeResponse.ok) {
          logger.error(
            `Failed to remove filter: ${removeResponse.status} ${removeResponse.statusText}`
          );

          const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `${emojis.crossmark} Failed to remove filter. Please try again later.`
            )
          );

          await buttonInteraction.editReply({
            flags: [MessageFlags.IsComponentsV2],
            components: [errorContainer],
          });
          return;
        }

        const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`${emojis.checkmark} Filter removed from <#${channel.id}>!`)
        );

        await buttonInteraction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [successContainer],
        });
      });

      buttonCollector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(`${emojis.crossmark} Filter removal timed out.`)
          );

          selectInteraction
            .editReply({
              flags: [MessageFlags.IsComponentsV2],
              components: [timeoutContainer],
            })
            .catch(() => {});
        }
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
    logger.error(error, 'Failed to remove filter');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to remove filter. Please try again later.`)
    );

    await interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
