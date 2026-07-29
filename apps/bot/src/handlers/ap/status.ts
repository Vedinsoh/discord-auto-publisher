import { config } from '@ap/config';
import { PUBLISH_PERMISSION_FLAGS, sortBySidebarOrder } from '@ap/utils';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import {
  ChannelType,
  ContainerBuilder,
  type Guild,
  type GuildMember,
  MessageFlags,
  type NewsChannel,
  type Snowflake,
} from 'discord.js';
import { emojis, notes } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';
import { formatNotes } from 'utils/notes.js';
import { checkChannelPermissions } from 'utils/permissions.js';

/** One registered channel, resolved against the guild's channel cache. */
interface StatusChannel {
  channelId: Snowflake;
  /** Bot has View + Send + Manage here. False also covers unresolvable channels. */
  canPublish: boolean;
}

const resolveAnnouncementChannel = (
  guild: Guild,
  channelId: Snowflake
): NewsChannel | undefined => {
  const resolved = guild.channels.cache.get(channelId);
  return resolved?.type === ChannelType.GuildAnnouncement ? resolved : undefined;
};

/**
 * Registered channel ids in Discord sidebar order, via the same shared sort the
 * dashboard's channel list is built with, so the two surfaces can't disagree.
 * A `null` guild means there is no channel cache to read (uncached interaction)
 * — the backend's order is then passed through untouched.
 */
const orderChannelIds = (channelIds: Snowflake[], guild: Guild | null): Snowflake[] => {
  if (!guild) return channelIds;

  const categoryPositions = new Map<Snowflake, number>();
  for (const c of guild.channels.cache.values()) {
    if (c.type === ChannelType.GuildCategory) categoryPositions.set(c.id, c.rawPosition);
  }

  return sortBySidebarOrder(
    channelIds,
    channelId => {
      // Unresolvable channels have no position — sink them past their group,
      // still tiebroken by id, so the order stays deterministic.
      const resolved = resolveAnnouncementChannel(guild, channelId);
      return {
        id: channelId,
        position: resolved?.rawPosition ?? Number.MAX_SAFE_INTEGER,
        parentId: resolved?.parentId ?? null,
      };
    },
    categoryPositions
  );
};

/**
 * Registered channels in the dashboard Overview's order: channels that can't
 * publish first, then the rest, sidebar order preserved within each group (a
 * stable sort over the pre-ordered ids — mirrors `statusRank` in
 * `apps/web/src/components/dashboard/channel-status.tsx`).
 *
 * `canPublish` is a cache-only permission check, so it matches the dashboard's
 * own okay/not-okay state. A channel counts as broken when the bot lacks any
 * publish permission or the channel can't be resolved at all (deleted, or no
 * ViewChannel so it never entered the cache). Without a resolvable bot member
 * every channel is reported publishing rather than mislabelling all of them.
 */
const buildStatusChannels = (
  channelIds: Snowflake[],
  guild: Guild | null,
  botMember: GuildMember | null
): StatusChannel[] =>
  orderChannelIds(channelIds, guild)
    .map(channelId => {
      const resolved = guild ? resolveAnnouncementChannel(guild, channelId) : undefined;
      const canPublish =
        !guild || !botMember
          ? true
          : !!resolved && checkChannelPermissions(botMember, resolved).hasAll;
      return { channelId, canPublish };
    })
    .sort((a, b) => Number(a.canPublish) - Number(b.canPublish));

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

      const botMember = (await interaction.guild?.members.me?.fetch()) ?? null;
      const statusChannels = buildStatusChannels(channelIds, interaction.guild, botMember);
      const blockedCount = statusChannels.filter(c => !c.canPublish).length;
      const count = statusChannels.length;

      // Header mirrors the dashboard Overview's precedence and copy: the outage
      // owns the headline when there is one, otherwise "All good" + the count.
      const header =
        blockedCount > 0
          ? `### ${emojis.crossmark} **${blockedCount}** channel${blockedCount !== 1 ? "s aren't" : " isn't"} publishing\nGrant the missing permissions — see the list below.`
          : `### ${emojis.checkmark} All good\nPublishing in **${count}** channel${count !== 1 ? 's' : ''}.`;

      // One row per channel with its own status label, same as the Overview's cards.
      const channelList = statusChannels
        .map(({ channelId, canPublish }) =>
          canPublish
            ? `${emojis.checkmark} <#${channelId}> — Publishing`
            : `${emojis.crossmark} <#${channelId}> — Not publishing`
        )
        .join('\n');

      const listContainer = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(header))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay => textDisplay.setContent(channelList));

      // At least one channel can't publish → the fix instructions the Overview
      // puts behind its per-row "Fix" button (same required permissions, same
      // "resumes on its own" promise). No auto-disable exists; setup is retained.
      if (blockedCount > 0) {
        const fixContent = `Auto Publisher is missing permissions in the ${emojis.crossmark}-flagged channel${blockedCount !== 1 ? 's' : ''} above, so ${blockedCount !== 1 ? "they won't" : "it won't"} publish. Grant ${blockedCount !== 1 ? 'them' : 'it'} these permissions and publishing resumes on its own:`;
        const permissionsList = PUBLISH_PERMISSION_FLAGS.map(perm => `- \`${perm.name}\``).join(
          '\n'
        );

        listContainer
          .addSeparatorComponents(separator => separator)
          .addTextDisplayComponents(textDisplay => textDisplay.setContent(fixContent))
          .addTextDisplayComponents(textDisplay => textDisplay.setContent(permissionsList));
      }

      // Paused channels are retained but over the free limit of 3 (ADR 0009) —
      // surfaced so the user understands why they went quiet, with the path back.
      // Trails the serving channels, matching the Overview's paused rows.
      if (pausedChannelIds.length > 0) {
        const n = pausedChannelIds.length;
        const pausedContent = `${emojis.warning} **${n}** channel${n !== 1 ? 's are' : ' is'} paused — over the free limit of 3. Upgrade to Premium to restore ${n !== 1 ? 'them' : 'it'}:`;
        const pausedList = orderChannelIds(pausedChannelIds, interaction.guild)
          .map(id => `<#${id}> — Paused`)
          .join('\n');

        listContainer
          .addSeparatorComponents(separator => separator)
          .addTextDisplayComponents(textDisplay => textDisplay.setContent(pausedContent))
          .addTextDisplayComponents(textDisplay => textDisplay.setContent(pausedList));
      }

      listContainer.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          formatNotes([
            notes.rateLimit,
            config.isPremiumInstance ? notes.publishDelayPremium : notes.publishDelayFree,
          ]).trimStart()
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
