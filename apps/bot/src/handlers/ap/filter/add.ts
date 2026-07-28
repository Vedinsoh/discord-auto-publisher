import { config } from '@ap/config';
import { capitalize, normalizeFilterValues } from '@ap/utils';
import { FilterType } from '@ap/validations';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import {
  type ChannelType,
  ContainerBuilder,
  LabelBuilder,
  MentionableSelectMenuBuilder,
  MessageFlags,
  ModalBuilder,
  type ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';
import { emojis } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { handlePremiumCheck } from 'utils/interactions.js';
import { logger } from 'utils/logger.js';
import { buildOperatorLabel, extractNegate, operatorLabel } from './operator.js';

export async function chatInputFilterAdd(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
  // Check for premium instance
  if (await handlePremiumCheck(interaction, 'filtering')) return;

  // This is handled by the GuildOnly precondition
  if (!interaction.inGuild()) return;

  // Get option values
  const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);
  const type = interaction.options.getString('type', true) as FilterType;

  try {
    const channelStatus = await Services.Channel.getStatus(channel.id);

    if (!channelStatus?.enabled) {
      const notEnabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Auto-publishing is not enabled in <#${channel.id}> channel.\n\n-# Use </ap enable:${interaction.commandId}> to enable auto-publishing in this channel.`
        )
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [notEnabledContainer],
      });
      return;
    }

    // Check filter count
    const currentFilters = channelStatus.filters?.length ?? 0;
    if (currentFilters >= config.limits.filtersPerChannel) {
      const maxFiltersContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Maximum ${config.limits.filtersPerChannel} filters per channel. Remove a filter before adding a new one.`
        )
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [maxFiltersContainer],
      });
      return;
    }

    // Build and show modal
    const modal = buildFilterModal(type, currentFilters);
    await interaction.showModal(modal);

    // Await modal submit
    const modalSubmit = await interaction.awaitModalSubmit({
      filter: i => i.customId === `filter_add_${type}`,
      time: 900_000, // 15 minutes
    });

    // Extract and validate values
    const extractResult = extractModalValues(modalSubmit, type);

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

    const { values, negate } = extractResult;

    // Normalize values (keywords are converted to lowercase for case-insensitive matching)
    const normalizedValues = normalizeFilterValues(values, type);

    // Submit to backend
    const response = await Data.API.Backend.addFilter(channel.id, {
      type,
      negate,
      values: normalizedValues,
    });

    if (!response.ok) {
      if (response.status === 400) {
        // Parse error body to distinguish between validation errors and max filters error
        const errorData = (await response.json().catch(() => ({ message: '' }))) as {
          message?: string;
        };
        const errorMessage = errorData.message || '';

        let userMessage: string;

        if (errorMessage.includes('Maximum') && errorMessage.includes('filters')) {
          // Max filters error
          userMessage = `${emojis.crossmark} Maximum ${config.limits.filtersPerChannel} filters per channel. Remove a filter before adding a new one.`;
        } else if (errorMessage.startsWith('Invalid input:')) {
          // Validation error - show the specific validation message
          userMessage = `${emojis.crossmark} ${errorMessage}`;
        } else {
          // Generic 400 error
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
        const notEnabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.crossmark} Channel not enabled for auto-publishing.\n\n-# Use </ap enable:${interaction.commandId}> to enable auto-publishing in this channel.`
          )
        );

        await modalSubmit.reply({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [notEnabledContainer],
        });
        return;
      }

      logger.error(`Failed to add filter: ${response.status} ${response.statusText}`);

      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`${emojis.crossmark} Failed to add filter. Please try again later.`)
      );

      await modalSubmit.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [errorContainer],
      });
      return;
    }

    // Format values for display (use normalized values to show what's actually stored)
    const displayValues =
      type === FilterType.Author || type === FilterType.Mention
        ? normalizedValues.map(v => `<@${v}>`).join(', ')
        : type === FilterType.Webhook
          ? normalizedValues.map(v => `\`${v}\``).join(', ')
          : normalizedValues.map(v => `\`${v}\``).join(', ');

    const valueCount = normalizedValues.length > 1 ? ` (${normalizedValues.length})` : '';

    const conditionEmoji = negate ? emojis.crossmark : emojis.checkmark;
    const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.checkmark} Filter added to <#${channel.id}>!\n\n**Condition:** ${conditionEmoji} ${capitalize(type)} ${operatorLabel(type, negate).toLowerCase()}${valueCount}\n**Values:** ${displayValues}\n\n-# Conditions combine per this channel's match mode — set it with </ap filter mode:${interaction.commandId}>.`
      )
    );

    await modalSubmit.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [successContainer],
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('time')) {
      const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} No response received. Filter creation cancelled.`
        )
      );

      await interaction.followUp({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [timeoutContainer],
      });
      return;
    }

    logger.error(error, 'Failed to add filter');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to add filter. Please try again later.`)
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [errorContainer],
      });
    } else {
      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [errorContainer],
      });
    }
  }
}

/**
 * Build modal based on filter type
 */
function buildFilterModal(type: FilterType, currentCount: number): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`filter_add_${type}`)
    .setTitle(
      `Add ${capitalize(type)} Filter (${currentCount + 1}/${config.limits.filtersPerChannel})`
    );

  // Operator selection (common to all types) — maps to `negate`.
  const operatorField = buildOperatorLabel(type);

  switch (type) {
    case FilterType.Keyword: {
      const keywordInput = new TextInputBuilder()
        .setCustomId('value')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('announcement, giveaway, update')
        .setMinLength(1)
        .setMaxLength(1000)
        .setRequired(true);

      const keywordLabel = new LabelBuilder()
        .setLabel('Keywords (max 20)')
        .setDescription(
          'Comma-separated. Matches whole words. Wildcards: spam* (starts), *spam (ends), *spam* (contains).'
        )
        .setTextInputComponent(keywordInput);

      modal.addLabelComponents(keywordLabel, operatorField);
      break;
    }

    case FilterType.Author: {
      const authorSelect = new UserSelectMenuBuilder()
        .setCustomId('value')
        .setPlaceholder('Select users or bots')
        .setMinValues(1)
        .setMaxValues(10)
        .setRequired(true);

      const authorLabel = new LabelBuilder()
        .setLabel('Message Authors (max 10)')
        .setDescription('Select the users or bots whose messages will be filtered.')
        .setUserSelectMenuComponent(authorSelect);

      modal.addLabelComponents(authorLabel, operatorField);
      break;
    }

    case FilterType.Mention: {
      const mentionSelect = new MentionableSelectMenuBuilder()
        .setCustomId('value')
        .setPlaceholder('Select users or roles')
        .setMinValues(1)
        .setMaxValues(10)
        .setRequired(true);

      const mentionLabel = new LabelBuilder()
        .setLabel('Users or Roles (max 10)')
        .setDescription('Select the users or roles mentioned in messages to be filtered.')
        .setMentionableSelectMenuComponent(mentionSelect);

      modal.addLabelComponents(mentionLabel, operatorField);
      break;
    }

    case FilterType.Webhook: {
      const webhookInput = new TextInputBuilder()
        .setCustomId('value')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('1234567890123456789, 9876543210987654321')
        .setMinLength(17)
        .setMaxLength(500)
        .setRequired(true);

      const webhookLabel = new LabelBuilder()
        .setLabel('Webhook IDs (max 10)')
        .setDescription(
          'Enter webhook IDs separated by commas. Copy from webhook message or find in webhook URL.'
        )
        .setTextInputComponent(webhookInput);

      modal.addLabelComponents(webhookLabel, operatorField);
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
  type: FilterType
): { valid: true; values: string[]; negate: boolean } | { valid: false; error: string } {
  try {
    // Operator (maps to `negate`) from the StringSelectMenu.
    const negate = extractNegate(modalSubmit);

    if (negate === null) {
      return { valid: false, error: 'Please choose how this condition matches' };
    }

    // Get values based on type
    let values: string[];

    switch (type) {
      case FilterType.Keyword: {
        // TextInput value using proper getter
        const rawKeywords = modalSubmit.fields.getTextInputValue('value').trim();

        // Process keywords: split by comma, trim, filter empty
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

      case FilterType.Author:
      case FilterType.Mention: {
        // UserSelectMenu/MentionableSelectMenu - access components directly
        // Components V2 structure: LabelModalData with nested component property
        const valueLabel = modalSubmit.components.find(
          label => 'component' in label && label.component.customId === 'value'
        );

        if (!valueLabel || !('component' in valueLabel)) {
          return {
            valid: false,
            error:
              type === FilterType.Author
                ? 'User selection is required'
                : 'Mention selection is required',
          };
        }

        const valueComponent = valueLabel.component;
        // Type guard: check if component has values property (select menus)
        const selectedValues =
          'values' in valueComponent && Array.isArray(valueComponent.values)
            ? valueComponent.values
            : [];

        if (selectedValues.length === 0) {
          return {
            valid: false,
            error:
              type === FilterType.Author
                ? 'Please select at least one user or bot'
                : 'Please select at least one user or role',
          };
        }

        if (selectedValues.length > 10) {
          return {
            valid: false,
            error:
              type === FilterType.Author
                ? 'Maximum 10 users allowed'
                : 'Maximum 10 mentions allowed',
          };
        }

        values = selectedValues;
        break;
      }

      case FilterType.Webhook: {
        // TextInput value using proper getter
        const rawWebhookIds = modalSubmit.fields.getTextInputValue('value').trim();

        // Process webhook IDs: split by comma, trim, filter empty
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

    return { valid: true, values, negate };
  } catch (error) {
    logger.error(error, 'Failed to extract modal values');
    return { valid: false, error: 'Failed to process modal submission' };
  }
}
