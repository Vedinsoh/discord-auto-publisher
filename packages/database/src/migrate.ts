import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './client.js';

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../migrations');

export const runMigrations = async () => {
  await migrate(db, { migrationsFolder });
};
