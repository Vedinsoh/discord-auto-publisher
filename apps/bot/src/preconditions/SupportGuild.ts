import { type Command, Precondition } from '@sapphire/framework';
import { env } from 'lib/config/env.js';

const supportGuildId = env.BOT_SUPPORT_GUILD_ID;

export class SupportGuildPrecondition extends Precondition {
  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    return this.isSupportGuild(interaction);
  }

  private async isSupportGuild(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.guild?.id === supportGuildId) return this.ok();
    return this.error();
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    SupportGuild: never;
  }
}
