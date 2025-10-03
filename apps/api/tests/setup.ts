// setup.ts
import { beforeEach, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { getPrisma } from '../src/prisma';

// Initialize the database once per worker
// This file should be imported only once per worker so we should be fine 
// without the guard but just to be safe.
let dbReady = false;

if (!dbReady) {
  await initDatabase();
  dbReady = true;
}

beforeEach(async () => {
  await truncateDatabase();
});

afterAll(async () => {
  await getPrisma().$disconnect();
});


// This will create a isolated test database for the current worker
async function initDatabase() {
  if (dbReady) return;
  
  const workerId = process.env.VITEST_WORKER_ID ?? '0';
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const testDbUrl = dbUrl.replace(/(\/[^\/\?]+)(\?.*)?$/, `$1_${workerId}$2`);
  process.env.DATABASE_URL = testDbUrl;

  execSync('pnpm exec prisma db push --force-reset --skip-generate', { stdio: 'inherit' });
  dbReady = true;
}

async function truncateDatabase() {
  const tables = await getPrisma().$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  if (tables.length) {
    const names = tables.map(t => `"${t.tablename}"`).join(', ');
    await getPrisma().$executeRawUnsafe(
      `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE;`
    );
  }
}