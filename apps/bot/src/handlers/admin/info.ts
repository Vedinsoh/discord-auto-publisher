import type { Subcommand } from '@sapphire/plugin-subcommands';
import { ContainerBuilder, MessageFlags } from 'discord.js';
import { client } from 'lib/shard.js';
import { Services } from 'services/index.js';

export async function chatInputInfo(
  this: Subcommand,
  interaction: Subcommand.ChatInputCommandInteraction
) {
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

  const replyContainer = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay => textDisplay.setContent(infoContent))
    .addSeparatorComponents(separator => separator)
    .addTextDisplayComponents(textDisplay => textDisplay.setContent(messagesQueueContent));

  return interaction.editReply({
    flags: [MessageFlags.IsComponentsV2],
    components: [replyContainer],
  });
}
