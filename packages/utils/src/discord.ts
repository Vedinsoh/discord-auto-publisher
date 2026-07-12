import { PermissionFlagsBits } from 'discord-api-types/v10';

/**
 * Converts a Unix timestamp (in milliseconds) to Discord's timestamp format (in seconds).
 *
 * @param timestamp - The timestamp in milliseconds to convert. If `undefined` or falsy, returns `0`.
 * @returns The timestamp in seconds, rounded down to the nearest integer. Returns `0` if input is falsy.
 */
export const getDiscordFormat = (timestamp: number | undefined): number => {
  if (!timestamp) return 0;
  return Math.floor((timestamp || 0) / 1000);
};

/**
 * The one canonical set of permissions a bot needs to crosspost in an
 * announcement channel. Discord's crosspost endpoint requires `SEND_MESSAGES`
 * (own messages) plus `MANAGE_MESSAGES` (others' messages); `VIEW_CHANNEL` is
 * the baseline to interact with the channel at all. `READ_MESSAGE_HISTORY` is
 * NOT required (crossposting reads nothing).
 *
 * Shared by the bot hot path, the bot `/ap` commands, and the backend gate so
 * the three permission checks can never drift. Values are raw Discord bits, so
 * both discord.js (`permissionsFor(me).has(bit)`) and discord-api-types
 * consumers can use them directly.
 */
export const PUBLISH_PERMISSION_FLAGS = [
  { bit: PermissionFlagsBits.ViewChannel, name: 'View Channel' },
  { bit: PermissionFlagsBits.SendMessages, name: 'Send Messages' },
  { bit: PermissionFlagsBits.ManageMessages, name: 'Manage Messages' },
] as const;

/** Combined bitmask of every {@link PUBLISH_PERMISSION_FLAGS} permission. */
export const PUBLISH_PERMISSIONS_MASK = PUBLISH_PERMISSION_FLAGS.reduce(
  (mask, { bit }) => mask | bit,
  0n
);

/**
 * Display names of the {@link PUBLISH_PERMISSION_FLAGS} absent from `permissions`
 * (an effective-permission bitmask). Empty array = the bot can publish.
 */
export const missingPublishPermissions = (permissions: bigint): string[] =>
  PUBLISH_PERMISSION_FLAGS.filter(({ bit }) => (permissions & bit) !== bit).map(({ name }) => name);
