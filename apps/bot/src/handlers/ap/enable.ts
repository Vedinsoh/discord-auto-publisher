import { config } from '@ap/config';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { type ChannelType, ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis, links, notes } from 'lib/constants/index.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';
import { formatNotes } from 'utils/notes.js';
import { checkChannelPermissions } from 'utils/permissions.js';

export async function chatInputEnable(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  // This is handled by the GuildOnly precondition
  if (!interaction.inGuild()) return;

  // Get option values
  const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

  const botMember = await interaction.guild?.members.me?.fetch();
  if (!botMember) {
    logger.error('Failed to fetch bot member information');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.crossmark} Failed to enable auto-publishing in <#${channel.id}>. Please try again later.`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }

  const permissionCheck = checkChannelPermissions(botMember, channel);

  if (!permissionCheck.hasAll) {
    const title = `### ${emojis.warning} Missing Permissions`;
    const content = `Bot requires the following permissions in <#${channel.id}> channel to enable auto-publishing:`;
    const permissionsList = permissionCheck.permissions
      .map(perm => `- ${perm.has ? emojis.checkmark : emojis.crossmark} \`${perm.name}\``)
      .join('\n');
    const retryContent = 'Please review the permissions and try enabling auto-publishing again.';

    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay => textDisplay.setContent(title))
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay => textDisplay.setContent(content))
      .addTextDisplayComponents(textDisplay => textDisplay.setContent(permissionsList))
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay => textDisplay.setContent(retryContent));

    await interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
    return;
  }

  try {
    const response = await Services.Channel.enable(interaction.guildId, channel.id);

    if (!response.ok) {
      if (response.status === 409) {
        const infoContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.info} Auto-publishing is already enabled in <#${channel.id}> channel.`
          )
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [infoContainer],
        });
      }

      if (response.status === 400) {
        // The backend tags a channel-limit rejection with a reason code so we
        // can direct entitled guilds to finish premium setup instead of
        // upselling a plan they already bought.
        const code = await response
          .clone()
          .json()
          .then(body => (body as { code?: string })?.code)
          .catch(() => undefined);
        const entitledButNotServing =
          code === 'LIMIT_PREMIUM_INVITE' || code === 'LIMIT_PREMIUM_PENDING';

        const limitContent = entitledButNotServing
          ? `${emojis.crossmark} Your **Premium** bot isn't publishing in this server yet, so you're still capped at ${config.limits.channelsPerGuild} channels.\n\n` +
            `Finish setting up Premium in the dashboard at [${links.hostname}](<${links.dashboard}>) to unlock unlimited channels.`
          : `${emojis.crossmark} You have reached the maximum number of channels (${config.limits.channelsPerGuild}) for auto-publishing.\n\n` +
            `✨ Upgrade to **Premium** at [${links.hostname}](<${links.website}>) to unlock unlimited channels and extra features!`;

        const limitContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(limitContent)
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [limitContainer],
        });
      }

      logger.error(`Failed to enable auto-publishing: ${response.status} ${response.statusText}`);

      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${emojis.crossmark} Failed to enable auto-publishing in <#${channel.id}>. Please try again later.`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }

    // Seed publish-state for this channel so the dashboard reflects it at once
    // (ADR 0008) — perms were just verified above, so this is a free push.
    void Services.Permissions.syncChannels(botMember.guild, [channel], {
      full: false,
      clearBlocked: false,
    });

    const successMessage =
      `${emojis.checkmark} Auto-publishing has been enabled in <#${channel.id}> channel!` +
      formatNotes([notes.rateLimit, config.isPremiumInstance && notes.publishDelay]);

    const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(successMessage)
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [successContainer],
    });
  } catch (error) {
    logger.error(error, 'Failed to enable auto-publishing');

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        `${emojis.crossmark} Failed to enable auto-publishing in <#${channel.id}>. Please try again later.`
      )
    );

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [errorContainer],
    });
  }
}
