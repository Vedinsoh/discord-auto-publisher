import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Data } from 'data/index.js';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis } from 'lib/constants/index.js';
import { handlePremiumCheck } from 'utils/interactions.js';
import { logger } from 'utils/logger.js';

export async function chatInputFilterRemove(
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
  const filterId = interaction.options.getString('filter_id', true);

  try {
    const response = await Data.API.Backend.removeFilter(interaction.guildId, channel.id, filterId);

    if (!response.ok) {
      logger.error(`Failed to remove filter: ${response.status} ${response.statusText}`);

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
    logger.error(error, 'Failed to remove filter');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(`${emojis.crossmark} Failed to remove filter. Please try again later.`)
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
