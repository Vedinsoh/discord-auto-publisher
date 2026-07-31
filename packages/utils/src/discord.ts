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

/** Ascending snowflake compare (ids vary in length, so compare numerically) */
export const compareSnowflakes = (a: string, b: string): number => {
  const bigA = BigInt(a);
  const bigB = BigInt(b);
  return bigA < bigB ? -1 : bigA > bigB ? 1 : 0;
};

/** The three fields {@link sortBySidebarOrder} needs off a channel. */
export interface SidebarSortKey {
  id: string;
  /** Raw Discord `position` (`rawPosition` in discord.js) — scoped per category. */
  position: number;
  parentId: string | null;
}

/**
 * Reorders a flat channel list into Discord's sidebar order: uncategorized
 * channels first, then categories by their position, channels within a category
 * by their own position, ties broken by snowflake id ascending (Discord's own
 * tiebreak). `position` is scoped per category, so the category rank has to be
 * compared first.
 *
 * Shared by the backend's dashboard channel list and the bot's `/ap overview` so
 * the two surfaces can never order the same guild differently. The `select`
 * accessor keeps it agnostic of the caller's channel shape (raw `APIChannel`
 * vs. discord.js), and items are returned untouched.
 *
 * @param channels channels to order
 * @param select pulls the sort key off one channel
 * @param categoryPositions raw `position` of every category in the guild, read
 * before the list was filtered down to the channels being sorted
 */
export const sortBySidebarOrder = <T>(
  channels: readonly T[],
  select: (channel: T) => SidebarSortKey,
  categoryPositions: ReadonlyMap<string, number>
): T[] => {
  // Uncategorized (and orphaned-parent) channels rank above every category.
  const groupRank = (key: SidebarSortKey): number =>
    (key.parentId != null ? categoryPositions.get(key.parentId) : undefined) ?? -1;

  return channels
    .map(channel => ({ channel, key: select(channel) }))
    .sort(
      (a, b) =>
        groupRank(a.key) - groupRank(b.key) ||
        a.key.position - b.key.position ||
        compareSnowflakes(a.key.id, b.key.id)
    )
    .map(({ channel }) => channel);
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
