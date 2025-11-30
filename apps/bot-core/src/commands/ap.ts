import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
  ChannelType,
  ContainerBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { emojis, messages } from 'lib/consts/index.js';
import { Services } from '../services/index.js';
import { checkChannelPermissions } from '../utils/permissions.js';

@ApplyOptions<Subcommand.Options>({
  description: 'Configure publishing in your announcement channels',
  requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
  runIn: ['GUILD_ANY'],
  subcommands: [
    { name: 'enable', chatInputRun: 'chatInputEnable' },
    { name: 'disable', chatInputRun: 'chatInputDisable' },
    { name: 'status', chatInputRun: 'chatInputStatus' },
  ],
})
export class APCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand(builder =>
      builder //
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setContexts([InteractionContextType.Guild])
        .addSubcommand(subcommand =>
          subcommand //
            .setName('enable')
            .setDescription('Enable auto-publishing in announcement channel')
            .addChannelOption(option =>
              option //
                .setName('channel')
                .setDescription('The announcement channel to enable auto-publishing in')
                .setRequired(true)
                .addChannelTypes([ChannelType.GuildAnnouncement])
            )
        )
        .addSubcommand(subcommand =>
          subcommand //
            .setName('disable')
            .setDescription('Disable auto-publishing in announcement channel')
            .addChannelOption(option =>
              option //
                .setName('channel')
                .setDescription('The announcement channel to disable auto-publishing in')
                .setRequired(true)
                .addChannelTypes([ChannelType.GuildAnnouncement])
            )
        )
        .addSubcommand(subcommand =>
          subcommand //
            .setName('status')
            .setDescription(
              'Check auto-publishing status for a channel or list all enabled channels'
            )
            .addChannelOption(option =>
              option //
                .setName('channel')
                .setDescription(
                  'The announcement channel to check (leave empty to list all enabled channels)'
                )
                .setRequired(false)
                .addChannelTypes([ChannelType.GuildAnnouncement])
            )
        )
    );
  }

  public async chatInputEnable(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Enable auto-publishing in the channel
    if (!interaction.guildId) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`${emojis.crossmark} This command can only be used in a server.`)
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }

    const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

    // Check if the bot has the necessary permissions to enable auto-crossposting in the channel
    const botMember = await interaction.guild?.members.me?.fetch();
    if (!botMember) {
      this.container.logger.error('Failed to fetch bot member information');

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

    // Inform the user if the bot is missing any required permissions
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
          const limitContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `${emojis.crossmark} You have reached the maximum number of channels (3) for auto-publishing.\n\n` +
                '✨ Upgrade to **Pro** at <https://auto-publisher.gg> to enable unlimited channels and gain extra benefits!'
            )
          );

          return interaction.editReply({
            flags: [MessageFlags.IsComponentsV2],
            components: [limitContainer],
          });
        }

        this.container.logger.error(
          `Failed to enable auto-publishing: ${response.status} ${response.statusText}`
        );

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

      const successMessage = `${emojis.checkmark} Auto-publishing has been enabled in <#${channel.id}> channel!`;

      const successContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(successMessage + messages.delayNote)
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [successContainer],
      });
    } catch (error) {
      this.container.logger.error('Failed to enable auto-publishing:', error);

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

  public async chatInputDisable(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!interaction.guildId) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`${emojis.crossmark} This command can only be used in a server.`)
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }

    const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

    try {
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

  public async chatInputStatus(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!interaction.guildId) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`${emojis.crossmark} This command can only be used in a server.`)
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [errorContainer],
      });
    }

    const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', false);

    // If no channel is provided, list all enabled channels in the guild
    if (!channel) {
      try {
        const channelIds = await Services.Channel.getGuildChannels(interaction.guildId);

        if (!channelIds || channelIds.length === 0) {
          const noChannelsContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `${emojis.crossmark} No channels are currently enabled for auto-publishing in this server.`
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
        this.container.logger.error('Failed to get guild channels:', error);

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

    // If channel is provided, check status for that specific channel
    try {
      const channelStatus = await Services.Channel.getStatus(interaction.guildId, channel.id);

      if (!channelStatus || !channelStatus.enabled) {
        const disabledContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${emojis.crossmark} Auto-publishing is **disabled** in <#${channel.id}> channel.`
          )
        );

        return interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [disabledContainer],
        });
      }

      // Check bot permissions in the channel
      const botMember = await interaction.guild?.members.me?.fetch();
      if (!botMember) {
        this.container.logger.error('Failed to fetch bot member information for permission check');

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

      // If enabled but missing permissions, show warning
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
          `${emojis.checkmark} Auto-publishing is **enabled** in <#${channel.id}> channel.${messages.delayNote}`
        )
      );

      return interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [enabledContainer],
      });
    } catch (error) {
      this.container.logger.error('Failed to check auto-publishing status:', error);

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
}
