import { isPremiumInstance } from '@ap/utils';
import type { Filter } from '@ap/validations';
import type { Message } from 'discord.js';
import { Services } from './index.js';

/**
 * Evaluate if message passes filters
 * @param message Discord message
 * @param channelId Channel ID
 * @returns true if message should be published, false otherwise
 */
const evaluate = async (message: Message, channelId: string): Promise<boolean> => {
  // Skip filter check if not premium
  if (!isPremiumInstance) {
    return true;
  }

  try {
    // Get channel status including filters from backend
    const channelStatus = await Services.Channel.getStatus(message.guildId!, channelId);

    if (!channelStatus || !channelStatus.filters || channelStatus.filters.length === 0) {
      return true;
    }

    const filters = channelStatus.filters as Filter[];
    const content = message.content.toLowerCase();
    const authorId = message.author.id;

    // Separate include and exclude filters
    const includeFilters = filters.filter(f => f.mode === 'include');
    const excludeFilters = filters.filter(f => f.mode === 'exclude');

    // Check exclude filters first (if any match, block message)
    for (const filter of excludeFilters) {
      if (matchesFilter(filter, content, authorId, message)) {
        return false;
      }
    }

    // If there are include filters, message must match at least one
    if (includeFilters.length > 0) {
      return includeFilters.some(filter => matchesFilter(filter, content, authorId, message));
    }

    // No include filters or all passed
    return true;
  } catch {
    // On error, allow publishing (fail open)
    return true;
  }
};

/**
 * Check if message matches a filter
 * @param filter Filter to check
 * @param content Message content (lowercase)
 * @param authorId Message author ID
 * @param message Full message object
 * @returns true if matches, false otherwise
 */
const matchesFilter = (
  filter: Filter,
  content: string,
  authorId: string,
  message: Message
): boolean => {
  const value = filter.value.toLowerCase();

  switch (filter.type) {
    case 'keyword':
      return content.includes(value);

    case 'mention': {
      // Check if the message mentions the specified user ID
      return message.mentions.users.has(filter.value);
    }

    case 'author':
      return authorId === filter.value;

    case 'regex':
      try {
        const regex = new RegExp(filter.value, 'i');
        return regex.test(message.content);
      } catch {
        // Invalid regex, ignore filter
        return false;
      }

    default:
      return false;
  }
};

export const FilterService = {
  evaluate,
};
