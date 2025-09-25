import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ButtonBuilder, ButtonStyle, ContainerBuilder, MessageFlags } from 'discord.js';
import { links } from 'lib/consts/index.js';

@ApplyOptions<Command.Options>({
  description: 'Get useful links related to the bot',
})
export class LinksCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder //
        .setName(this.name)
        .setDescription(this.description)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const websiteButton = new ButtonBuilder()
      .setLabel('Website')
      .setURL(links.website)
      .setStyle(ButtonStyle.Link);

    const botInviteButton = new ButtonBuilder()
      .setLabel('Invite the bot!')
      .setURL(links.botInvite)
      .setStyle(ButtonStyle.Link);

    const supportServerButton = new ButtonBuilder()
      .setLabel('Support server')
      .setURL(links.supportGuildInvite)
      .setStyle(ButtonStyle.Link);

    const buttonsContainer = new ContainerBuilder()
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('Find out more on the website')
          )
          .setButtonAccessory(websiteButton)
      )
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('Join the support server')
          )
          .setButtonAccessory(supportServerButton)
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('**Add bot to your server**')
          )
          .setButtonAccessory(botInviteButton)
      );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [buttonsContainer],
    });
  }
}
