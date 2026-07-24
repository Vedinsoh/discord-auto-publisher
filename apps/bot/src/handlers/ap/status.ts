import { config } from '@ap/config';
import { PUBLISH_PERMISSION_FLAGS } from '@ap/utils';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis, notes } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';
import { formatNotes } from 'utils/notes.js';
import { checkChannelPermissions } from 'utils/permissions.js';

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
      const guildChannels = await Services.Channel.getGuildChannels(interaction.guildId);
      const channelIds = guildChannels?.channelIds ?? null;
      const pausedChannelIds = guildChannels?.pausedChannelIds ?? [];

      if (!channelIds || channelIds.length === 0) {
        const apCommandId = await interaction.client.application.commands
          .fetch()
          .then(commands => commands.findKey(command => command.name === 'ap'))
          .catch(logger.error);

        const noChannelsContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.botFree} No channels are currently enabled for auto-publishing in this server.\n\n-# ${emojis.greenCircle} Get started by using </ap enable:${apCommandId}> to enable auto-publishing in a channel.`
          )
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [noChannelsContainer],
        });
      }

      // Per-channel publish-permission check (cache-only, mirrors the dashboard's
      // canPublish so Discord and web report identical okay/not-okay states). A
      // channel is flagged when the bot lacks View/Send/Manage or can't resolve
      // it at all (deleted / no ViewChannel). Skipped only if the bot member
      // can't be resolved, to avoid mislabelling every channel as broken.
      const botMember = await interaction.guild?.members.me?.fetch();
      const misconfiguredIds = botMember
        ? channelIds.filter(id => {
            const resolved = botMember.guild.channels.cache.get(id);
            if (!resolved || resolved.type !== ChannelType.GuildAnnouncement) return true;
            return !checkChannelPermissions(botMember, resolved).hasAll;
          })
        : [];
      const misconfiguredSet = new Set(misconfiguredIds);

      const channelList = channelIds
        .map(id => (misconfiguredSet.has(id) ? `- ${emojis.warning} <#${id}>` : `- <#${id}>`))
        .join('\n');
      const count = channelIds.length;

      // Paused channels are retained but over the free limit of 3 (ADR 0009) —
      // surfaced so the user understands why they went quiet, with the path back.
      const pausedSection =
        pausedChannelIds.length > 0
          ? `\n\n${emojis.warning} **${pausedChannelIds.length}** channel${pausedChannelIds.length !== 1 ? 's are' : ' is'} paused — over the free limit of 3. Upgrade to Premium to restore ${pausedChannelIds.length !== 1 ? 'them' : 'it'}:\n\n${pausedChannelIds.map(id => `- <#${id}>`).join('\n')}`
          : '';

      const listContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.checkmark} Auto-publishing is enabled in **${count}** channel${count !== 1 ? 's' : ''}:\n\n${channelList}${pausedSection}${formatNotes([config.isPremiumInstance ? notes.publishDelayPremium : notes.publishDelayFree])}`
        )
      );

      // At least one channel is misconfigured → separator + fix instructions that
      // match the dashboard's "fix" flow (same required permissions, same "resumes
      // on its own" promise). No auto-disable exists; the setup is retained.
      if (misconfiguredSet.size > 0) {
        const n = misconfiguredSet.size;
        const fixTitle = `### ${emojis.warning} **${n}** channel${n !== 1 ? 's' : ''} can't publish`;
        const fixContent = `Auto Publisher is missing permissions in the ${emojis.warning}-flagged channel${n !== 1 ? 's' : ''} above, so ${n !== 1 ? "they won't" : "it won't"} publish. Grant ${n !== 1 ? 'them' : 'it'} these permissions and publishing resumes on its own:`;
        const permissionsList = PUBLISH_PERMISSION_FLAGS.map(perm => `- \`${perm.name}\``).join(
          '\n'
        );

        listContainer
          .addSeparatorComponents(separator => separator)
          .addTextDisplayComponents(textDisplay => textDisplay.setContent(fixTitle))
          .addTextDisplayComponents(textDisplay => textDisplay.setContent(fixContent))
          .addTextDisplayComponents(textDisplay => textDisplay.setContent(permissionsList));
      }

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
    const channelStatus = await Services.Channel.getStatus(channel.id);

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
        "Until these are granted, messages here can't get published. Bot will automatically resume publishing once the permissions are restored.";

      const warningContainer = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(title))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(content))
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(permissionsList))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(warningContent));

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [warningContainer],
      });
    }

    const enabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.checkmark} Auto-publishing is **enabled** in <#${channel.id}> channel.` +
          formatNotes([
            config.isPremiumInstance ? notes.publishDelayPremium : notes.publishDelayFree,
          ])
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
