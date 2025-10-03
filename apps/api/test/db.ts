import { beforeEach, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve as pathResolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { getPrisma } from '../src/prisma';

// Resolve prisma CLI JS via require.resolve (export-map safe)
const requireFromHere = createRequire(import.meta.url);
const prismaPkgPath = requireFromHere.resolve('prisma/package.json');
const prismaCliJs = join(dirname(prismaPkgPath), 'build', 'index.js');

// Resolve schema path ALWAYS relative to this file: ../prisma/schema.prisma
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = pathResolve(__dirname, '..', 'prisma', 'schema.prisma');

/** Build a per-worker DATABASE_URL by appending workerId to the DB name */
export function derivePerWorkerDbUrl(baseUrl: string, workerId: string) {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/[^/]+$/, (name) => `${name}_${workerId}`);
  return url.toString();
}

/** Initialize the schema for this worker (db push, no generate) */
export async function initDatabaseForWorker(workerId: string) {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL is required');

  process.env.DATABASE_URL = derivePerWorkerDbUrl(baseUrl, workerId);

  execFileSync(
    process.execPath,
    [prismaCliJs, 'db', 'push', '--schema', schemaPath, '--force-reset', '--skip-generate'],
    { stdio: 'ignore', env: process.env }
  );
}

/** Truncate all public tables between tests */
async function truncateDatabase() {
  const tables = await getPrisma().$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  if (tables.length) {
    const names = tables.map((t) => `"${t.tablename}"`).join(', ');
    await getPrisma().$executeRawUnsafe(
      `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE;`
    );
  }
}

/** Register per-test hooks for cleanup & teardown */
export function registerPerTestHooks() {
  beforeEach(async () => {
    await truncateDatabase();
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });
}