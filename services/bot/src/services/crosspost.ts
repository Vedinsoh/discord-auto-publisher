import { type Message, type NewsChannel, PermissionsBitField } from 'discord.js';
import urlRegex from 'url-regex-safe';
import { Data } from '#data';
import type { ReceivedMessage } from '#types/MessageTypes';
import { sleep } from '#utils/common';
import { secToMs } from '#utils/timeConverters';

/**
 * Handles the message for crossposting
 * @param message Message object
 * @param channel NewsChannel object
 */
const handle = async (message: Message, channel: NewsChannel) => {
  // Check if the bot has the necessary permissions to crosspost
  const botMember = await message.guild?.members.me?.fetch();
  const permissionsBitfield = botMember?.permissionsIn(channel);

  // Check necessary permissions
  if (!permissionsBitfield?.has(PermissionsBitField.Flags.ManageMessages)) return;
  if (!permissionsBitfield?.has(PermissionsBitField.Flags.SendMessages)) return;

  // If message has no text content, crosspost immediately
  if (!message.content) {
    return push(message);
  }

  // Check if the message has a URL and no embeds
  const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
  const hasEmbeds = Boolean(message.embeds.length);

  // Defer crossposting if the message has a URL but no embeds
  if (hasUrl && !hasEmbeds) {
    await sleep(secToMs(5));
  }

  // Push the message for crossposting
  return push(message);
};

/**
 * Sends a message to the REST service to crosspost
 * @param message Message to crosspost
 */
const push = async (message: ReceivedMessage) => {
  return await Data.API.REST.pushCrosspost(message.channel.id, message.id);
};

export const Crosspost = { handle, push };
