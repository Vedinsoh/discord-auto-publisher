import type { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags } from 'discord.js';

export async function chatInputPing(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const perfStart = Date.now();
  await interaction.editReply('Measuring...');
  const perfEnd = Date.now();

  return interaction.editReply(`**Ping:** ${Math.ceil(perfEnd - perfStart)}ms`);
}
