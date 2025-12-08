import { capitalize, normalizeFilterValues } from '@ap/utils';
import type { Filter } from '@ap/validations';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import {
  ActionRowBuilder,
  type ChannelType,
  ComponentType,
  ContainerBuilder,
  LabelBuilder,
  MentionableSelectMenuBuilder,
  MessageFlags,
  ModalBuilder,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';
import { emojis } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { handlePremiumCheck } from 'utils/interactions.js';
import { logger } from 'utils/logger.js';

export async function chatInputFilterEdit(
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
        label: `${filter.type} - ${filter.mode}`,
        description: valuePreview.substring(0, 100),
        value: filter.id,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_select')
      .setPlaceholder('Select a filter to edit')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const selectContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`Select a filter to edit from <#${channel.id}>:`)
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
      const selectedFilterId = selectInteraction.values[0];
      const selectedFilter = filters.find(f => f.id === selectedFilterId);

      if (!selectedFilter) {
        await selectInteraction.deferUpdate();

        const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`${emojis.crossmark} Filter not found. Please try again.`)
        );

        await selectInteraction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [errorContainer],
        });
        return;
      }

      // Build and show modal with pre-populated values
      const modal = buildEditFilterModal(selectedFilter);
      await selectInteraction.showModal(modal);

      // Await modal submit
      try {
        const modalSubmit = await selectInteraction.awaitModalSubmit({
          filter: i => i.customId === `filter_edit_${selectedFilterId}`,
          time: 900_000, // 15 minutes
        });

        // Extract and validate values
        const extractResult = extractModalValues(modalSubmit, selectedFilter.type);

        if (!extractResult.valid) {
          const validationErrorContainer = new ContainerBuilder().addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`${emojis.crossmark} ${extractResult.error}`)
          );

          await modalSubmit.reply({
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: [validationErrorContainer],
          });
          return;
        }

        const { values, mode } = extractResult;

        // Normalize values (keywords are converted to lowercase for case-insensitive matching)
        const normalizedValues = normalizeFilterValues(values, selectedFilter.type);

        // Submit update to backend
        const response = await Data.API.Backend.updateFilter(channel.id, selectedFilterId, {
          type: selectedFilter.type,
          mode,
          values: normalizedValues,
        });

        if (!response.ok) {
          if (response.status === 400) {
            const errorData = (await response.json().catch(() => ({ message: '' }))) as {
              message?: string;
            };
            const errorMessage = errorData.message || '';

            let userMessage: string;

            if (errorMessage.startsWith('Invalid input:')) {
              userMessage = `${emojis.crossmark} ${errorMessage}`;
            } else {
              userMessage = `${emojis.crossmark} Invalid request. Please try again.`;
            }

            const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(userMessage)
            );

            await modalSubmit.reply({
              flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
              components: [errorContainer],
            });
            return;
          }

          if (response.status === 404) {
            const notFoundContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(`${emojis.crossmark} Filter not found.`)
            );

            await modalSubmit.reply({
              flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
              components: [notFoundContainer],
            });
            return;
          }

          logger.error(`Failed to update filter: ${response.status} ${response.statusText}`);

          const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `${emojis.crossmark} Failed to update filter. Please try again later.`
            )
          );

          await modalSubmit.reply({
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: [errorContainer],
          });
          return;
        }

        // Format values for display (use normalized values to show what's actually stored)
        const displayValues =
          selectedFilter.type === 'author' || selectedFilter.type === 'mention'
            ? normalizedValues.map(v => `<@${v}>`).join(', ')
            : selectedFilter.type === 'webhook'
              ? normalizedValues.map(v => `\`${v}\``).join(', ')
              : normalizedValues.map(v => `\`${v}\``).join(', ');

        const modeText =
          mode === 'allow'
            ? 'Only messages matching this filter will be published'
            : 'Messages matching this filter will NOT be published';

        const valueCount = normalizedValues.length > 1 ? ` (${normalizedValues.length})` : '';

        const modeEmoji = mode === 'allow' ? emojis.checkmark : emojis.crossmark;
        const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.checkmark} Filter updated in <#${channel.id}>!\n\n**Type:** ${selectedFilter.type}${valueCount}\n**Mode:** ${modeEmoji} ${mode}\n**Values:** ${displayValues}\n\n-# ${modeText}`
          )
        );

        await modalSubmit.reply({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [successContainer],
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('time')) {
          const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(`${emojis.crossmark} No response received. Edit cancelled.`)
          );

          await interaction.followUp({
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: [timeoutContainer],
          });
        }
      }
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
    logger.error(error, 'Failed to edit filter');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to edit filter. Please try again later.`)
    );

    await interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}

/**
 * Build modal for editing filter with pre-populated values
 */
function buildEditFilterModal(filter: Filter): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`filter_edit_${filter.id}`)
    .setTitle(`Edit ${capitalize(filter.type)} Filter`);

  // Mode selection (common to all types)
  const modeSelect = new StringSelectMenuBuilder()
    .setCustomId('mode')
    .setPlaceholder('Select filter mode')
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Allow')
        .setValue('allow')
        .setDescription('Only publish messages matching this filter')
        .setEmoji(emojis.checkmark)
        .setDefault(filter.mode === 'allow'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Block')
        .setValue('block')
        .setDescription("Don't publish messages matching this filter")
        .setEmoji(emojis.crossmark)
        .setDefault(filter.mode === 'block')
    );

  const modeLabel = new LabelBuilder()
    .setLabel('Filter Mode')
    .setStringSelectMenuComponent(modeSelect);

  switch (filter.type) {
    case 'keyword': {
      const keywordInput = new TextInputBuilder()
        .setCustomId('value')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('announcement, giveaway, update')
        .setMinLength(1)
        .setMaxLength(1000)
        .setRequired(true)
        .setValue(filter.values.join(', ')); // Pre-populate with existing values

      const keywordLabel = new LabelBuilder()
        .setLabel('Keywords (max 20)')
        .setDescription(
          'Enter words to look for in messages. Use commas to separate multiple keywords.'
        )
        .setTextInputComponent(keywordInput);

      modal.addLabelComponents(keywordLabel, modeLabel);
      break;
    }

    case 'author': {
      // Format current values for display in description
      const currentUsers = filter.values.map(id => `<@${id}>`).join(', ');
      const description = `Current: ${currentUsers}\n\nSelect the users or bots whose messages will be filtered.`;

      const authorSelect = new UserSelectMenuBuilder()
        .setCustomId('value')
        .setPlaceholder('Select users or bots')
        .setMinValues(1)
        .setMaxValues(10)
        .setRequired(true);

      const authorLabel = new LabelBuilder()
        .setLabel('Message Authors (max 10)')
        .setDescription(description)
        .setUserSelectMenuComponent(authorSelect);

      modal.addLabelComponents(authorLabel, modeLabel);
      break;
    }

    case 'mention': {
      // Format current values for display in description
      const currentMentions = filter.values
        .map(v => (v.startsWith('&') ? `<@&${v.slice(1)}>` : `<@${v}>`))
        .join(', ');
      const description = `Current: ${currentMentions}\n\nSelect the users or roles mentioned in messages to be filtered.`;

      const mentionSelect = new MentionableSelectMenuBuilder()
        .setCustomId('value')
        .setPlaceholder('Select users or roles')
        .setMinValues(1)
        .setMaxValues(10)
        .setRequired(true);

      const mentionLabel = new LabelBuilder()
        .setLabel('Users or Roles (max 10)')
        .setDescription(description)
        .setMentionableSelectMenuComponent(mentionSelect);

      modal.addLabelComponents(mentionLabel, modeLabel);
      break;
    }

    case 'webhook': {
      const webhookInput = new TextInputBuilder()
        .setCustomId('value')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('1234567890123456789, 9876543210987654321')
        .setMinLength(17)
        .setMaxLength(500)
        .setRequired(true)
        .setValue(filter.values.join(', ')); // Pre-populate with existing webhook IDs

      const webhookLabel = new LabelBuilder()
        .setLabel('Webhook IDs (max 10)')
        .setDescription(
          'Enter webhook IDs separated by commas. Copy from webhook message or find in webhook URL.'
        )
        .setTextInputComponent(webhookInput);

      modal.addLabelComponents(webhookLabel, modeLabel);
      break;
    }
  }

  return modal;
}

/**
 * Extract and validate values from modal submission
 */
function extractModalValues(
  modalSubmit: ModalSubmitInteraction,
  type: string
): { valid: true; values: string[]; mode: 'allow' | 'block' } | { valid: false; error: string } {
  try {
    // Get mode from StringSelectMenu
    const modeLabel = modalSubmit.components.find(
      label => 'component' in label && label.component.customId === 'mode'
    );

    if (!modeLabel || !('component' in modeLabel)) {
      return { valid: false, error: 'Mode selection is required' };
    }

    const modeComponent = modeLabel.component;
    const mode =
      'values' in modeComponent && Array.isArray(modeComponent.values)
        ? modeComponent.values[0]
        : undefined;

    if (!mode || (mode !== 'allow' && mode !== 'block')) {
      return { valid: false, error: 'Please select a filter mode (Allow or Block)' };
    }

    // Get values based on type
    let values: string[];

    switch (type) {
      case 'keyword': {
        const rawKeywords = modalSubmit.fields.getTextInputValue('value').trim();
        const keywords = rawKeywords
          .split(',')
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 0);

        if (keywords.length === 0) {
          return { valid: false, error: 'At least one keyword is required' };
        }

        if (keywords.length > 20) {
          return { valid: false, error: 'Maximum 20 keywords allowed' };
        }

        values = keywords;
        break;
      }

      case 'author':
      case 'mention': {
        const valueLabel = modalSubmit.components.find(
          label => 'component' in label && label.component.customId === 'value'
        );

        if (!valueLabel || !('component' in valueLabel)) {
          return {
            valid: false,
            error:
              type === 'author' ? 'User selection is required' : 'Mention selection is required',
          };
        }

        const valueComponent = valueLabel.component;
        const selectedValues =
          'values' in valueComponent && Array.isArray(valueComponent.values)
            ? valueComponent.values
            : [];

        if (selectedValues.length === 0) {
          return {
            valid: false,
            error:
              type === 'author'
                ? 'Please select at least one user or bot'
                : 'Please select at least one user or role',
          };
        }

        if (selectedValues.length > 10) {
          return {
            valid: false,
            error: type === 'author' ? 'Maximum 10 users allowed' : 'Maximum 10 mentions allowed',
          };
        }

        values = selectedValues;
        break;
      }

      case 'webhook': {
        const rawWebhookIds = modalSubmit.fields.getTextInputValue('value').trim();
        const webhookIds = rawWebhookIds
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0);

        if (webhookIds.length === 0) {
          return {
            valid: false,
            error: 'At least one webhook ID is required',
          };
        }

        if (webhookIds.length > 10) {
          return { valid: false, error: 'Maximum 10 webhook IDs allowed' };
        }

        // Validate each webhook ID snowflake format (17-20 digits)
        for (const webhookId of webhookIds) {
          if (!/^\d{17,20}$/.test(webhookId)) {
            return {
              valid: false,
              error: `Invalid webhook ID format: ${webhookId}. Must be 17-20 digits.`,
            };
          }
        }

        values = webhookIds;
        break;
      }

      default:
        return { valid: false, error: 'Unknown filter type' };
    }

    return { valid: true, values, mode };
  } catch (error) {
    logger.error(error, 'Failed to extract modal values');
    return { valid: false, error: 'Failed to process modal submission' };
  }
}
