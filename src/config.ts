import 'dotenv/config';
import fs from 'node:fs';
import ConfigType from '#types/ConfigType';

// TODO env dev/prod
// TODO add config validation by type

const configFile = fs.readFileSync('./config.json', 'utf8');
const config = JSON.parse(configFile) as ConfigType;

export default config;
