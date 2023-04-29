declare namespace NodeJS {
  export interface ProcessEnv {
    BOT_TOKEN: string;
    REDIS_URI: string;
    MONGO_URI: string;
    BOT_ADMINS: string;
    LOGGER_LEVEL: string;
  }
}
