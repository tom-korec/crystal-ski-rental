/**
 * The environment the end-to-end suite runs against: `.env.test` for local runs, with variables
 * already set in the environment taking precedence, which is how CI points it at its own database.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

const ENV_FILE = path.resolve(import.meta.dirname, '../.env.test');

function loadEnvFile(): Record<string, string | undefined> {
  try {
    return parseEnv(readFileSync(ENV_FILE, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

const fromFile = loadEnvFile();

function required(name: string): string {
  const value = process.env[name] ?? fromFile[name];

  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.test, or export it before running the suite.`);
  }

  return value;
}

/**
 * The suite truncates and reseeds its database, so it refuses anything but a local `_test` database, even
 * when a deployed database's URL is exported in the shell.
 */
function localTestDatabaseUrl(): string {
  const value = required('DATABASE_URL');
  const { hostname, pathname } = new URL(value);

  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname) || !pathname.endsWith('_test')) {
    throw new Error(
      `The end-to-end suite only runs against a local database named *_test, not ${hostname}${pathname}.`,
    );
  }

  return value;
}

const databaseUrl = localTestDatabaseUrl();

export const testPort = Number(process.env.E2E_PORT ?? fromFile.E2E_PORT ?? 3100);
export const testBaseUrl = `http://localhost:${testPort}`;

export const testServerEnv = {
  BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
  // Always the server under test, so auth callbacks reach the port Playwright started.
  BETTER_AUTH_URL: testBaseUrl,
  DATABASE_URL: databaseUrl,
  // prisma.config.ts migrates through DATABASE_URL_UNPOOLED when it is set, which a pulled Vercel env would.
  DATABASE_URL_UNPOOLED: databaseUrl,
  PORT: String(testPort),
};
