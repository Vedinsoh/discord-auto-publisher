import { Channel } from './channel.js';
import { Crosspost } from './crosspost.js';
import { FilterService } from './filter.js';
import { Guild } from './guild.js';
import { Info } from './info.js';

export const Services = {
  Channel,
  Crosspost,
  Filter: FilterService,
  Guild,
  Info,
};
