import { beforeEach } from 'vitest';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fast database truncation using raw SQL
async function truncateDatabase() {
  // Get all table names and truncate them dynamically
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;
  
  if (tables.length > 0) {
    const tableNames = tables.map((t: { tablename: string }) => `"${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;
    `);
  }
}

// Global setup: truncate database before each test
beforeEach(async () => {
  await truncateDatabase();
});
