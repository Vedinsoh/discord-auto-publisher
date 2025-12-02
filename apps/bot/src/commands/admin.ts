import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { InteractionContextType, PermissionFlagsBits } from 'discord.js';
import { env } from 'lib/config/env.js';
import {
  chatInputInfo,
  chatInputPing,
  chatInputRespawn,
  chatInputShutdown,
  chatInputUptime,
} from '../handlers/admin/index.js';

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
        builder
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

  // Subcommand handlers
  public chatInputInfo = chatInputInfo;
  public chatInputPing = chatInputPing;
  public chatInputRespawn = chatInputRespawn;
  public chatInputShutdown = chatInputShutdown;
  public chatInputUptime = chatInputUptime;
}
