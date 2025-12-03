import { isPremiumInstance } from '@ap/utils';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis } from 'lib/constants/index.js';
import { Services } from 'services/index.js';

export async function chatInputDisable(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  // This is handled by the GuildOnly precondition
  if (!interaction.inGuild()) return;

  // Get option values
  const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

  try {
    if (isPremiumInstance) {
      const channelStatus = await Services.Channel.getStatus(interaction.guildId, channel.id);
      const filters = channelStatus?.filters;
      if (filters && filters.length > 0) {
        const warningContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.warning} Disabling auto-publishing will also remove all filters set for <#${channel.id}> channel. If this is temporary, we suggest removing \`View Channel\` permission instead.\n\n-# Note: Don't keep permissions removed for too long, as the bot will automatically disable channels that lack proper permissions for an extended period.`
          )
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [warningContainer],
        });
      }
    }

    await Services.Channel.disable(interaction.guildId, channel.id);

    const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.checkmark} Auto-publishing has been disabled in <#${channel.id}> channel!`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [successContainer],
    });
  } catch (error) {
    this.container.logger.error('Failed to disable auto-publishing:', error);

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.crossmark} Failed to disable auto-publishing in <#${channel.id}>. Please try again later.`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
