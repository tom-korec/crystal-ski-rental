import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Migrations need a direct connection: a connection pooler cannot hold the session-level locks
// `migrate deploy` takes. Neon's Vercel integration provides the direct URL as DATABASE_URL_UNPOOLED
// next to the pooled DATABASE_URL the app uses; locally the two are the same database.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed/index.ts' },
  datasource: { url },
});
