declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | undefined;
    BOT_TOKEN: string;
    REDIS_URL: string;
  }
}
