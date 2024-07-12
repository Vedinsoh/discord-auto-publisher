declare namespace NodeJS {
  export interface ProcessEnv {
    DISCORD_TOKEN: string;
    REDIS_URI: string;
    MONGO_URI: string;

    BOT_ADMINS: string;
    BOT_SHARDS: string;
    BOT_SHARDS_PER_CLUSTER: string;
    BOT_REQUESTS_PER_SECOND: string;
    LOGGER_LEVEL: string;
  }
}
