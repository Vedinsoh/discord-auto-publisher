import { getDiscordFormat } from '@ap/utils';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
  ContainerBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { env } from 'lib/config/env.js';
import { client } from 'lib/shard.js';
import { Services } from 'services/index.js';
import { respawnClusters, shutdown } from 'utils/process.js';

@ApplyOptions<Subcommand.Options>({
  description: '[BOT ADMIN] Utility command for bot admins',
  requiredUserPermissions: [PermissionFlagsBits.Administrator],
  preconditions: ['SupportGuild'],
  subcommands: [
    { name: 'info', chatInputRun: 'chatInputInfo' },
    { name: 'ping', chatInputRun: 'chatInputPing' },
    { name: 'respawn', chatInputRun: 'chatInputRespawn' },
    { name: 'shutdown', chatInputRun: 'chatInputShutdown' },
    { name: 'uptime', chatInputRun: 'chatInputUptime' },
  ],
})
export class AdminCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand(
      builder =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
          .setContexts([InteractionContextType.Guild])
          .addSubcommand(subcommand =>
            subcommand //
              .setName('info')
              .setDescription('[BOT ADMIN] Get information about the bot')
          )
          .addSubcommand(subcommand =>
            subcommand //
              .setName('ping')
              .setDescription("[BOT ADMIN] Check the bot's latency")
          )
          .addSubcommand(subcommand =>
            subcommand //
              .setName('respawn')
              .setDescription('[BOT ADMIN] Respawn the bot')
          )
          .addSubcommand(subcommand =>
            subcommand //
              .setName('shutdown')
              .setDescription('[BOT ADMIN] Shutdown the bot')
          )
          .addSubcommand(subcommand =>
            subcommand //
              .setName('uptime')
              .setDescription('[BOT ADMIN] Check how long the bot has been online')
          ),
      {
        guildIds: [env.BOT_SUPPORT_GUILD_ID],
      }
    );
  }

  public async chatInputInfo(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const data = await Services.Info.get();
    const guildsCount = await client.cluster
      .broadcastEval('this.guilds.cache.size')
      .then((results: number[]) => results.reduce((p: number, n: number) => p + n));

    const infoContent = [
      '### Bot info:',
      `> Guilds: ${guildsCount}`,
      `> Enabled channels: ${data?.cache?.channels ?? 'N/A'}`,
      `> Channel queues size: ${data?.channelQueues}`,
      `> Rate limits cache size: ${data?.rateLimitsSize}`,
    ].join('\n');

    const messagesQueueContent = [
      '### Messages queue:',
      `> Size: ${data?.size}`,
      `> Pending: ${data?.pending}`,
      `> Paused: ${data?.paused}`,
    ].join('\n');

    const infoContainer = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay => textDisplay.setContent(infoContent))
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay => textDisplay.setContent(messagesQueueContent));

    return interaction.editReply({
      flags: [MessageFlags.IsComponentsV2],
      components: [infoContainer],
    });
  }

  public async chatInputPing(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const perfStart = Date.now();
    await interaction.editReply('Measuring...');
    const perfEnd = Date.now();

    return interaction.editReply(`**Ping:** ${Math.ceil(perfEnd - perfStart)}ms`);
  }

  public async chatInputRespawn(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Respawning...' });
    respawnClusters();
  }

  public async chatInputShutdown(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Shutting down...' });
    shutdown();
  }

  public async chatInputUptime(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const uptimes = await client.cluster.broadcastEval(c => c.uptime);
    const formattedUptimes = uptimes.map(
      (uptime, index) =>
        `Cluster ${index + 1} - ${uptime ? `<t:${getDiscordFormat(Date.now() - uptime)}:f>` : 'unknown'}`
    );

    interaction.editReply(formattedUptimes.join('\n'));
  }
}
