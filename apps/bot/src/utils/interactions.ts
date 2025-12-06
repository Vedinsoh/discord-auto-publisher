import { capitalize, isPremiumInstance } from '@ap/utils';
import type { ChatInputCommandInteraction } from 'discord.js';
import { ContainerBuilder, MessageFlags } from 'discord.js';
import { emojis, links } from '../lib/constants/index.js';

/**
 * Checks if running premium instance and replies with upgrade message if not.
 * @returns true if premium check failed (caller should return), false if premium (continue)
 */
export async function handlePremiumCheck(
  interaction: ChatInputCommandInteraction,
  featureName = 'this feature'
): Promise<boolean> {
  if (isPremiumInstance) return false;

  const premiumContainer = new ContainerBuilder().addTextDisplayComponents(textDisplay =>
    textDisplay.setContent(
      `${emojis.warning} ${capitalize(featureName)} is only available in **Premium** edition.\n\nUpgrade at [${links.hostname}](<${links.website}>) to unlock ${featureName} and other premium features!`
    )
  );

  await interaction.editReply({
    flags: [MessageFlags.IsComponentsV2],
    components: [premiumContainer],
  });

  return true;
}
