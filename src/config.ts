import 'dotenv/config';
import fs from 'node:fs';
import ConfigType from '#types/ConfigType';

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
const config = JSON.parse(configFile) as ConfigType;

export default config;
