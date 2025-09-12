import { beforeEach } from 'vitest';

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Global setup: truncate database before each test
beforeEach(async () => {
  // Delete all data in the correct order (respecting foreign key constraints)
  await prisma.oAuthToken.deleteMany();
  await prisma.user.deleteMany();
});
