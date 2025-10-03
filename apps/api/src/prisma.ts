import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;
let currentUrl: string | undefined;

export function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!prisma || currentUrl !== url) {
    prisma?.$disconnect().catch(() => {});
    prisma = new PrismaClient();
    currentUrl = url;
  }
  return prisma;
}

export async function resetPrisma() {
  if (prisma) {
    await prisma.$disconnect().catch(() => {});
    prisma = null;
    currentUrl = undefined;
  }
}