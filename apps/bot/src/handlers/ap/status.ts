import type { Subcommand } from '@sapphire/plugin-subcommands';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis, messages } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { checkChannelPermissions } from 'utils/permissions.js';
import { logger } from 'utils/logger.js';

export async function chatInputStatus(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  // This is handled by the GuildOnly precondition
  if (!interaction.inGuild()) return;

  // Get option values
  const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', false);

  // If no channel is provided, list all enabled channels
  if (!channel) {
    try {
      const channelIds = await Services.Channel.getGuildChannels(interaction.guildId);

      if (!channelIds || channelIds.length === 0) {
        const apCommandId = await interaction.client.application.commands
          .fetch()
          .then(commands => commands.findKey(command => command.name === 'ap'))
          .catch(logger.error);

        const noChannelsContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.botFree} No channels are currently enabled for auto-publishing in this server.\n\nGet started by using </ap enable:${apCommandId}> to enable auto-publishing in a channel.`
          )
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [noChannelsContainer],
        });
      }

      const channelList = channelIds.map(id => `- <#${id}>`).join('\n');
      const count = channelIds.length;

      const listContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.checkmark} Auto-publishing is enabled in **${count}** channel${count !== 1 ? 's' : ''}:\n\n${channelList}${messages.delayNote}`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [listContainer],
      });
    } catch (error) {
      logger.error(error, 'Failed to get guild channels');

      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Failed to retrieve auto-publishing channels. Please try again later.`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }
  }

  // If a specific channel is provided, check its status
  try {
    const channelStatus = await Services.Channel.getStatus(interaction.guildId, channel.id);

    if (!channelStatus || !channelStatus.enabled) {
      const disabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Auto-publishing is **not enabled** in <#${channel.id}> channel.\n\n-# Use </ap enable:${interaction.commandId}> to enable auto-publishing in this channel.`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [disabledContainer],
      });
    }

    const botMember = await interaction.guild?.members.me?.fetch();
    if (!botMember) {
      logger.error('Failed to fetch bot member information for permission check');

      const enabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.checkmark} Auto-publishing is **enabled** in <#${channel.id}> channel.`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [enabledContainer],
      });
    }

    const permissionCheck = checkChannelPermissions(botMember, channel);

    if (!permissionCheck.hasAll) {
      const title = `### ${emojis.warning} Auto-publishing enabled with missing permissions`;
      const content = `Auto-publishing is currently **enabled** in <#${channel.id}>, but the bot is missing required permissions:`;
      const permissionsList = permissionCheck.permissions
        .map(perm => `- ${perm.has ? emojis.checkmark : emojis.crossmark} \`${perm.name}\``)
        .join('\n');
      const warningContent =
        '**Warning:** The channel will be automatically disabled from auto-publishing within 7 days if permissions are not fixed.';
      const actionContent =
        'Please grant the missing permissions to ensure auto-publishing continues working.';

      const warningContainer = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(title))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(content))
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(permissionsList))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(warningContent))
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(actionContent));

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [warningContainer],
      });
    }

    const enabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.checkmark} Auto-publishing is **enabled** in <#${channel.id}> channel.` +
          messages.delayNote
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [enabledContainer],
    });
  } catch (error) {
    logger.error(error, 'Failed to check auto-publishing status');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.crossmark} Failed to check auto-publishing status for <#${channel.id}>. Please try again later.`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
