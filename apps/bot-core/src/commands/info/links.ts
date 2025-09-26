import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ContainerBuilder, MessageFlags } from 'discord.js';
import { Buttons } from 'lib/components/buttons.js';

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
    const buttonsContainer = new ContainerBuilder()
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('Find out more on the website')
          )
          .setButtonAccessory(Buttons.website)
      )
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('Join the support server')
          )
          .setButtonAccessory(Buttons.supportServer)
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('**Add bot to your server**')
          )
          .setButtonAccessory(Buttons.botInvite)
      );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [buttonsContainer],
    });
  }
}
