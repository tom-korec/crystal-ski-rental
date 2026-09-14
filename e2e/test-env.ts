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

export const testPort = Number(process.env.E2E_PORT ?? fromFile.E2E_PORT ?? 3100);
export const testBaseUrl = `http://localhost:${testPort}`;

export const testServerEnv = {
  BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
  // Always the server under test, so auth callbacks reach the port Playwright started.
  BETTER_AUTH_URL: testBaseUrl,
  DATABASE_URL: required('DATABASE_URL'),
  PORT: String(testPort),
};
