import { beforeEach, afterAll } from 'vitest';

import { getPrisma } from '../src/prisma';

async function truncateDatabase() {
  const tables = await getPrisma().$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  if (tables.length) {
    const names = tables.map(t => `"${t.tablename}"`).join(', ');
    await getPrisma().$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE;`);
  }
}

beforeEach(async () => {
  await truncateDatabase();
});

afterAll(async () => {
  await getPrisma().$disconnect();
});