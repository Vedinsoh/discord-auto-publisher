import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
  ChannelType,
  ContainerBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
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
            .setDescription('Check if auto-publishing is enabled in announcement channel')
            .addChannelOption(option =>
              option //
                .setName('channel')
                .setDescription('The announcement channel to check status for')
                .setRequired(true)
                .addChannelTypes([ChannelType.GuildAnnouncement])
            )
        )
    );
  }

  public async chatInputEnable(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Enable auto-publishing in the channel
    if (!interaction.guildId) {
      return interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
    }

    const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

    // Check if the bot has the necessary permissions to enable auto-crossposting in the channel
    const botMember = await interaction.guild?.members.me?.fetch();
    if (!botMember) {
      this.container.logger.error('Failed to fetch bot member information');
      return interaction.editReply({
        content: `❌ Failed to enable auto-publishing in <#${channel.id}>. Please try again later.`,
      });
    }

    const permissionCheck = checkChannelPermissions(botMember, channel);

    // Inform the user if the bot is missing any required permissions
    if (!permissionCheck.hasAll) {
      const title = '### ⚠️ Missing Permissions';
      const content = `Bot requires the following permissions in <#${channel.id}> channel to enable auto-publishing:`;
      const permissionsList = permissionCheck.permissions
        .map(perm => `- ${perm.has ? '✅' : '❌'} \`${perm.name}\``)
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
          return interaction.editReply({
            content: `ℹ️ Auto-publishing is already enabled in <#${channel.id}> channel.`,
          });
        }

        this.container.logger.error(
          `Failed to enable auto-publishing: ${response.status} ${response.statusText}`
        );
        return interaction.editReply({
          content: `❌ Failed to enable auto-publishing in <#${channel.id}>. Please try again later.`,
        });
      }

      return interaction.editReply({
        content: `✅ Auto-publishing has been enabled in <#${channel.id}> channel!`,
      });
    } catch (error) {
      this.container.logger.error('Failed to enable auto-publishing:', error);

      return interaction.editReply({
        content: `❌ Failed to enable auto-publishing in <#${channel.id}>. Please try again later.`,
      });
    }
  }

  public async chatInputDisable(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!interaction.guildId) {
      return interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
    }

    const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

    try {
      await Services.Channel.disable(interaction.guildId, channel.id);

      return interaction.editReply({
        content: `✅ Auto-publishing has been disabled in <#${channel.id}> channel!`,
      });
    } catch (error) {
      this.container.logger.error('Failed to disable auto-publishing:', error);

      return interaction.editReply({
        content: `❌ Failed to disable auto-publishing in <#${channel.id}>. Please try again later.`,
      });
    }
  }

  public async chatInputStatus(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!interaction.guildId) {
      return interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
    }

    const channel = interaction.options.getChannel<ChannelType.GuildAnnouncement>('channel', true);

    try {
      const channelStatus = await Services.Channel.getStatus(interaction.guildId, channel.id);

      if (!channelStatus || !channelStatus.enabled) {
        return interaction.editReply({
          content: `❌ Auto-publishing is **disabled** in <#${channel.id}> channel.`,
        });
      }

      // Check bot permissions in the channel
      const botMember = await interaction.guild?.members.me?.fetch();
      if (!botMember) {
        this.container.logger.error('Failed to fetch bot member information for permission check');
        return interaction.editReply({
          content: `✅ Auto-publishing is **enabled** in <#${channel.id}> channel.`,
        });
      }

      const permissionCheck = checkChannelPermissions(botMember, channel);

      // If enabled but missing permissions, show warning
      if (!permissionCheck.hasAll) {
        const title = '### ⚠️ Auto-publishing enabled with missing permissions';
        const content = `Auto-publishing is currently **enabled** in <#${channel.id}>, but the bot is missing required permissions:`;
        const permissionsList = permissionCheck.permissions
          .map(perm => `- ${perm.has ? '✅' : '❌'} \`${perm.name}\``)
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

      return interaction.editReply({
        content: `✅ Auto-publishing is **enabled** in <#${channel.id}> channel.`,
      });
    } catch (error) {
      this.container.logger.error('Failed to check auto-publishing status:', error);

      return interaction.editReply({
        content: `❌ Failed to check auto-publishing status for <#${channel.id}>. Please try again later.`,
      });
    }
  }
}
