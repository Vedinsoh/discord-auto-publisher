import 'dotenv/config';
import fs from 'node:fs';
import type z from 'zod';
import type { ConfigSchema } from '#schemas/ConfigSchema';
import validateConfig from '#util/validateConfig';

process.env.BASE_DIR = (() => {
  switch (process.env.NODE_ENV) {
    case 'development':
      return 'src';
    case 'production':
      return 'dist';
    default:
      return 'src';
  }
})();

const configFile = fs.readFileSync('./config.json', 'utf8');
const config = JSON.parse(configFile) as z.infer<typeof ConfigSchema>;

validateConfig(config);

export default config;
