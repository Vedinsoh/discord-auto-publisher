import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is required for database connection
    url: process.env.DATABASE_URL!,
  },
});
