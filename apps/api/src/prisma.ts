import { PrismaClient} from '@prisma/client';

let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL not set. Did you forget to run globalSetup before importing prisma?'
      );
    }

    prisma = new PrismaClient({
      datasources: {
        db: { url },
      },
    });
  }
  return prisma;
}