import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ChannelType, InteractionContextType, PermissionFlagsBits } from 'discord.js';
import {
  chatInputDisable,
  chatInputEnable,
  chatInputFilterAdd,
  chatInputFilterEdit,
  chatInputFilterMode,
  chatInputFilterRemove,
  chatInputFilterView,
  chatInputStatus,
} from '../handlers/ap/index.js';

@ApplyOptions<Subcommand.Options>({
  description: 'Configure publishing in your announcement channels',
  requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
  runIn: ['GUILD_ANY'],
  preconditions: ['GuildOnly'],
  subcommands: [
    { name: 'enable', chatInputRun: 'chatInputEnable' },
    { name: 'disable', chatInputRun: 'chatInputDisable' },
    { name: 'status', chatInputRun: 'chatInputStatus' },
    ...(config.isPremiumInstance
      ? [
          {
            name: 'filter',
            type: 'group' as const,
            entries: [
              { name: 'add', chatInputRun: 'chatInputFilterAdd' },
              { name: 'edit', chatInputRun: 'chatInputFilterEdit' },
              { name: 'mode', chatInputRun: 'chatInputFilterMode' },
              { name: 'remove', chatInputRun: 'chatInputFilterRemove' },
              { name: 'view', chatInputRun: 'chatInputFilterView' },
            ],
          },
        ]
      : []),
  ],
})
export class APCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand(builder => {
      const command = builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setContexts([InteractionContextType.Guild])
        .addSubcommand(subcommand =>
          subcommand //
            .setName('enable')
            .setDescription('Enable auto-publishing in announcement channel')
            .addChannelOption(option =>
              option
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
              option
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
        );

      if (config.isPremiumInstance) {
        command.addSubcommandGroup(group =>
          group //
            .setName('filter')
            .setDescription('Manage message filters for auto-publishing')
            .addSubcommand(subcommand =>
              subcommand //
                .setName('add')
                .setDescription('Add a filter to a channel')
                .addChannelOption(option =>
                  option
                    .setName('channel')
                    .setDescription('The announcement channel to add filter to')
                    .setRequired(true)
                    .addChannelTypes([ChannelType.GuildAnnouncement])
                )
                .addStringOption(option =>
                  option //
                    .setName('type')
                    .setDescription('Filter type')
                    .setRequired(true)
                    .addChoices(
                      { name: 'Keyword', value: 'keyword' },
                      { name: 'Author', value: 'author' },
                      { name: 'Mention', value: 'mention' },
                      { name: 'Webhook', value: 'webhook' }
                    )
                )
            )
            .addSubcommand(subcommand =>
              subcommand //
                .setName('edit')
                .setDescription('Edit a filter in a channel')
                .addChannelOption(option =>
                  option //
                    .setName('channel')
                    .setDescription('The announcement channel to edit filter in')
                    .setRequired(true)
                    .addChannelTypes([ChannelType.GuildAnnouncement])
                )
            )
            .addSubcommand(subcommand =>
              subcommand //
                .setName('remove')
                .setDescription('Remove a filter from a channel')
                .addChannelOption(option =>
                  option //
                    .setName('channel')
                    .setDescription('The announcement channel to remove filter from')
                    .setRequired(true)
                    .addChannelTypes([ChannelType.GuildAnnouncement])
                )
            )
            .addSubcommand(subcommand =>
              subcommand //
                .setName('view')
                .setDescription('View filters for a channel')
                .addChannelOption(option =>
                  option //
                    .setName('channel')
                    .setDescription('The announcement channel to view filters for')
                    .setRequired(true)
                    .addChannelTypes([ChannelType.GuildAnnouncement])
                )
            )
            .addSubcommand(subcommand =>
              subcommand //
                .setName('mode')
                .setDescription('Set filter mode for a channel')
                .addChannelOption(option =>
                  option //
                    .setName('channel')
                    .setDescription('The announcement channel to set filter mode for')
                    .setRequired(true)
                    .addChannelTypes([ChannelType.GuildAnnouncement])
                )
            )
        );
      }

      return command;
    });
  }

  // Subcommand handlers
  public chatInputEnable = chatInputEnable;
  public chatInputDisable = chatInputDisable;
  public chatInputStatus = chatInputStatus;
  public chatInputFilterAdd = chatInputFilterAdd;
  public chatInputFilterEdit = chatInputFilterEdit;
  public chatInputFilterMode = chatInputFilterMode;
  public chatInputFilterRemove = chatInputFilterRemove;
  public chatInputFilterView = chatInputFilterView;
}
