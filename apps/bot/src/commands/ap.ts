import { isPremiumInstance } from '@ap/utils';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ChannelType, InteractionContextType, PermissionFlagsBits } from 'discord.js';
import {
  chatInputDisable,
  chatInputEnable,
  chatInputFilterAdd,
  chatInputFilterList,
  chatInputFilterRemove,
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
    ...(isPremiumInstance
      ? [
          {
            name: 'filter',
            type: 'group' as const,
            entries: [
              { name: 'add', chatInputRun: 'chatInputFilterAdd' },
              { name: 'remove', chatInputRun: 'chatInputFilterRemove' },
              { name: 'list', chatInputRun: 'chatInputFilterList' },
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

      if (isPremiumInstance) {
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
                      { name: 'Mention', value: 'mention' },
                      { name: 'Author', value: 'author' },
                      { name: 'Regex', value: 'regex' }
                    )
                )
                .addStringOption(option =>
                  option //
                    .setName('value')
                    .setDescription(
                      'Filter value (user ID for mention/author, text for keyword/regex)'
                    )
                    .setRequired(true)
                    .setMaxLength(200)
                )
                .addStringOption(option =>
                  option //
                    .setName('matching')
                    .setDescription(
                      'Whether to publish messages that match or do not match this filter'
                    )
                    .setRequired(true)
                    .addChoices(
                      { name: 'Include (whitelist)', value: 'include' },
                      { name: 'Exclude (blacklist)', value: 'exclude' }
                    )
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
                .addStringOption(option =>
                  option //
                    .setName('filter_id')
                    .setDescription(
                      'The ID of the filter to remove (use /ap filter list to see IDs)'
                    )
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand =>
              subcommand //
                .setName('list')
                .setDescription('List all filters for a channel')
                .addChannelOption(option =>
                  option //
                    .setName('channel')
                    .setDescription('The announcement channel to list filters for')
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
  public chatInputFilterRemove = chatInputFilterRemove;
  public chatInputFilterList = chatInputFilterList;
}
