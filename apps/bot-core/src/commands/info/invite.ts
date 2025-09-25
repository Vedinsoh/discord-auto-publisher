import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { links } from 'lib/consts/index.js';

@ApplyOptions<Command.Options>({
  description: 'Add Auto Publisher to your server!',
})
export class InviteCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder //
        .setName(this.name)
        .setDescription(this.description)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const botInviteButton = new ButtonBuilder()
      .setLabel('Invite the bot!')
      .setURL(links.botInvite)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>() //
      .addComponents(botInviteButton);

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      components: [buttonRow],
    });
  }
}
