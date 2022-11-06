import 'dotenv/config';
import fs from 'node:fs';
import type z from 'zod';
import type { ConfigSchema } from '#schemas/ConfigSchema';
import validateConfig from '#util/validateConfig';

const configFile = fs.readFileSync('./config.json', 'utf8');
const config = JSON.parse(configFile) as z.infer<typeof ConfigSchema>;

validateConfig(config);

export default config;
