import { Snowflake } from 'discord-api-types/globals';

import { Data } from '@/data';

const add = (channelId: Snowflake, messageId: Snowflake) => {
  return Data.Repo.CrosspostsCounter.add(channelId, messageId);
};

const getCount = (channelId: Snowflake) => {
  return Data.Repo.CrosspostsCounter.getCount(channelId);
};

const getSize = () => {
  return Data.Repo.CrosspostsCounter.getSize();
};

export const CrosspostsCounter = { add, getCount, getSize };

global.crosspostsCounter = CrosspostsCounter;
