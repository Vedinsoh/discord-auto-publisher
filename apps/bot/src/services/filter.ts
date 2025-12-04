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

    // Separate allow and block filters
    const allowFilters = filters.filter(f => f.mode === 'allow');
    const blockFilters = filters.filter(f => f.mode === 'block');

    // Check block filters first (if any match, block message)
    for (const filter of blockFilters) {
      if (matchesFilter(filter, content, authorId, message)) {
        return false;
      }
    }

    // If there are allow filters, message must match at least one
    if (allowFilters.length > 0) {
      return allowFilters.some(filter => matchesFilter(filter, content, authorId, message));
    }

    // No allow filters or all passed
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
  switch (filter.type) {
    case 'keyword': {
      // Check if content contains any of the keywords
      const contentLower = content.toLowerCase();
      return filter.values.some(keyword => contentLower.includes(keyword.toLowerCase()));
    }

    case 'mention': {
      // Check if message mentions any of the specified users or roles
      return filter.values.some(
        id => message.mentions.users.has(id) || message.mentions.roles.has(id)
      );
    }

    case 'author': {
      // Check if author matches any of the specified author IDs
      return filter.values.includes(authorId);
    }

    case 'webhook': {
      // Check if webhook ID matches any of the specified webhook IDs
      return message.webhookId ? filter.values.includes(message.webhookId) : false;
    }

    default:
      return false;
  }
};

export const FilterService = {
  evaluate,
};
