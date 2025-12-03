import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis } from 'lib/constants/index.js';
import { handlePremiumCheck } from 'utils/interactions.js';
import { logger } from 'utils/logger.js';

export async function chatInputFilterAdd(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  // Check for premium instance
  if (await handlePremiumCheck(interaction, 'filtering')) return;

  // This is handled by the GuildOnly precondition
  if (!interaction.inGuild()) return;

  // Get option values
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

      logger.error(
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
    logger.error(error, 'Failed to add filter');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to add filter. Please try again later.`)
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
