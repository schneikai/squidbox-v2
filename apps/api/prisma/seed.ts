import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding dev user...');

  // hash the password
  const passwordHash = await hashPassword('devpassword123');

  // upsert ensures the user exists (creates if missing, updates if present)
  const user = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      email: 'dev@example.com',
      passwordHash
    },
  });

  console.log('✅ Dev user ready:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });