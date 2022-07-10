import { Snowflake } from 'discord.js-light';
import { levels } from 'pino';

interface Config {
  botAdmin: Snowflake;
  loggingLevel: typeof levels.labels[keyof typeof levels.labels];
  stringLocale: string;
  presenceInterval: number;
  urlDetection: {
    enabled: boolean;
    deferTimeout: number;
  };
  spam: {
    enabled: boolean;
    autoLeave: boolean;
    messagesThreshold: number;
  };
}

export default Config;
