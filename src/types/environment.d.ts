declare namespace NodeJS {
  export interface ProcessEnv {
    BOT_TOKEN: string;
    NODE_ENV: 'development' | 'production';
    BASE_DIR: 'src' | 'dist';
  }
}
