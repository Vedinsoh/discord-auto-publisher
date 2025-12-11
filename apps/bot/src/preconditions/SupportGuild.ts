import { env } from '@ap/config';
import { type Command, Precondition } from '@sapphire/framework';

const supportGuildId = env.BOT_SUPPORT_GUILD_ID;

export class SupportGuildPrecondition extends Precondition {
  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (interaction.guild?.id === supportGuildId) return this.ok();
    return this.error();
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    SupportGuild: never;
  }
}
