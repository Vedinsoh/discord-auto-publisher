declare namespace NodeJS {
  export interface ProcessEnv {
    BOT_TOKEN: string;
    REDIS_URI: string;
    MONGO_URI: string;

    BOT_ADMINS: string;
    SHARDS: string;
    SHARDS_PER_CLUSTER: string;
    REQUESTS_PER_SECOND: string;
    LOGGER_LEVEL: string;
  }
}
