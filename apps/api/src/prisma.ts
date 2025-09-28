import { PrismaClient} from '@prisma/client';

let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL not set. Did you forget to run globalSetup before importing prisma?'
      );
    }

    client = new PrismaClient({
      datasources: {
        db: { url },
      },
    });
  }
  return client;
}

export const prisma = getPrisma();