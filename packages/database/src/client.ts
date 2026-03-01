import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is required for database connection
const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, { schema });
