import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ContainerBuilder, MessageFlags } from 'discord.js';
import { Buttons } from 'lib/components/buttons.js';

@ApplyOptions<Command.Options>({
  description: 'Find helpful resources, invite the bot, and connect with our community!',
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
    const replyContainer = new ContainerBuilder().addSectionComponents(section =>
      section
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent('✨ **Add bot to your server** ✨')
        )
        .setButtonAccessory(Buttons.botInvite)
    );

    if (!config.isPremiumInstance) {
      replyContainer.addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('**Upgrade to Premium for more features!**')
          )
          .setButtonAccessory(Buttons.getPremium)
      );
    }

    replyContainer
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent('Join the support server')
          )
          .setButtonAccessory(Buttons.supportServer)
      )
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay => textDisplay.setContent('Official website'))
          .setButtonAccessory(Buttons.website)
      );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [replyContainer],
    });
  }
}
