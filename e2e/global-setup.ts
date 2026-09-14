/**
 * Resets the end-to-end database to the demo data before the suite runs. The specs sign in with the
 * seeded accounts and act on seeded skis and reservations, so every run needs the same starting point.
 * The schema itself is applied by the `webServer` command, which Playwright starts first.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { testServerEnv } from './test-env';

const ROOT = path.resolve(import.meta.dirname, '..');

export default function globalSetup() {
  const { host, pathname } = new URL(testServerEnv.DATABASE_URL);
  console.log(`Seeding e2e database ${host}${pathname}`);

  // The seed script is run directly rather than through `prisma db seed`, so nothing reads `.env` and
  // the development database stays out of reach.
  const result = spawnSync('pnpm', ['exec', 'tsx', 'prisma/seed/index.ts'], {
    cwd: ROOT,
    env: { ...process.env, ...testServerEnv },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Seeding the e2e database failed (exit code ${result.status}).`);
  }
}
