import { ResponseStatus, ServiceResponse } from 'data/models/serviceResponse.js';
import type { Snowflake } from 'discord-api-types/globals';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';

/**
 * Ensure guild exists in DB (creates if not exists)
 * @param guildId ID of the guild
 * @returns void
 */
const ensureExists = async (guildId: Snowflake) => {
  try {
    await Services.Guilds.DB.upsert(guildId);
    Services.Logger.debug(`Ensured guild ${guildId} exists in DB`);
  } catch (error) {
    Services.Logger.error(error);
    throw error;
  }
};

/**
 * Remove guild and all its channels
 * @param guildId ID of the guild
 * @returns Service response
 */
const remove = async (guildId: Snowflake) => {
  try {
    await Services.Guilds.DB.remove(guildId);
    Services.Logger.debug(`Removed guild ${guildId} and all associated channels`);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Guild and associated channels removed successfully',
      {
        success: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponse(
      ResponseStatus.Failed,
      'Failed to remove guild',
      {
        success: false,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Handler = {
  ensureExists,
  remove,
};
