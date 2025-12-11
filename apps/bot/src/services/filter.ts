import { config } from '@ap/config';
import { type Filter, FilterMatchMode, FilterMode, FilterType } from '@ap/validations';
import type { Message, NewsChannel } from 'discord.js';
import { Services } from './index.js';

/**
 * Evaluate if message passes filters
 * @param message Discord message
 * @param channelId Channel ID
 * @returns true if message should be published, false otherwise
 */
const evaluate = async (message: Message, channel: NewsChannel): Promise<boolean> => {
  // Skip filter check if not premium
  if (!config.isPremiumInstance) {
    return true;
  }

  try {
    const channelStatus = await Services.Channel.getStatus(channel.id);

    if (!channelStatus || !channelStatus.filters || channelStatus.filters.length === 0) {
      return true;
    }

    const filters = channelStatus.filters as Filter[];
    const filterMode = (channelStatus.filterMode as FilterMatchMode) || FilterMatchMode.Any;
    const content = message.content.toLowerCase();
    const authorId = message.author.id;

    // Separate allow and block filters
    const allowFilters = filters.filter(f => f.mode === FilterMode.Allow);
    const blockFilters = filters.filter(f => f.mode === FilterMode.Block);

    // Check block filters first (always use OR logic - block if any matches)
    for (const filter of blockFilters) {
      if (matchesFilter(filter, content, authorId, message)) {
        return false;
      }
    }

    // If there are allow filters, apply mode logic
    if (allowFilters.length > 0) {
      if (filterMode === FilterMatchMode.All) {
        // All allow filters must match
        return allowFilters.every(filter => matchesFilter(filter, content, authorId, message));
      } else {
        // At least one allow filter must match (default)
        return allowFilters.some(filter => matchesFilter(filter, content, authorId, message));
      }
    }

    // No allow filters - default allow
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
    case FilterType.Keyword: {
      // Check if content contains any of the keywords (keywords are stored in lowercase)
      return filter.values.some(keyword => content.includes(keyword));
    }

    case FilterType.Mention: {
      // Check if message mentions any of the specified users or roles
      return filter.values.some(
        id => message.mentions.users.has(id) || message.mentions.roles.has(id)
      );
    }

    case FilterType.Author: {
      // Check if author matches any of the specified author IDs
      return filter.values.includes(authorId);
    }

    case FilterType.Webhook: {
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
