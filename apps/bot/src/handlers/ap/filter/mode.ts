import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import {
  ActionRowBuilder,
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

export async function chatInputFilterMode(
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
    // Check if channel is enabled for auto-publishing
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

    const currentMode = (channelStatus.filterMode as 'any' | 'all') || 'any';

    // Create mode selection menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_mode_select')
      .setPlaceholder('Select filter mode')
      .addOptions([
        {
          label: 'Any (OR)',
          value: 'any',
          description: 'Message passes if at least one allow filter matches',
          default: currentMode === 'any',
        },
        {
          label: 'All (AND)',
          value: 'all',
          description: 'Message passes only if all allow filters match',
          default: currentMode === 'all',
        },
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const modeDescription =
      currentMode === 'any'
        ? '- Messages pass if **at least one** allow filter matches\n- Block filters always block if **any** matches'
        : '- Messages pass only if **all** allow filters match\n- Block filters always block if **any** matches';

    const selectContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `**Current filter mode:** ${currentMode === 'any' ? 'Any (OR)' : 'All (AND)'}\n\n${modeDescription}\n\nSelect a new mode for <#${channel.id}>:`
      )
    );

    const reply = await interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [selectContainer, row],
    });

    // Wait for selection
    const selectCollector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id && i.customId === 'filter_mode_select',
      time: 300_000, // 5 minutes
    });

    selectCollector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
      await selectInteraction.deferUpdate();

      const selectedMode = selectInteraction.values[0] as 'any' | 'all';

      const response = await Data.API.Backend.updateFilterMode(channel.id, selectedMode);

      if (!response.ok) {
        logger.error(`Failed to update filter mode: ${response.status} ${response.statusText}`);

        const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.crossmark} Failed to update filter mode. Please try again later.`
          )
        );

        await selectInteraction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [errorContainer],
        });
        return;
      }

      const newModeDescription =
        selectedMode === 'any'
          ? '- Messages will pass if **at least one** allow filter matches\n- Block filters will block if **any** matches'
          : '- Messages will pass only if **all** allow filters match\n- Block filters will block if **any** matches';

      const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.checkmark} Filter mode updated to **${selectedMode === 'any' ? 'Any (OR)' : 'All (AND)'}** for <#${channel.id}>!\n\n${newModeDescription}`
        )
      );

      await selectInteraction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [successContainer],
      });
    });

    selectCollector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`${emojis.crossmark} Filter mode selection timed out.`)
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
    logger.error(error, 'Failed to update filter mode');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.crossmark} Failed to update filter mode. Please try again later.`
      )
    );

    await interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
