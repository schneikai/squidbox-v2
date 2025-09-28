import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

// Start ephemeral Postgres + Redis for tests, set env, push schema, and return teardown
export default async function () {
  const pgUser = 'postgres';
  const pgPass = 'postgres';
  const pgDb = 'squidbox_test';
  const postgres = await new PostgreSqlContainer('postgres:16-alpine')
    .withUsername(pgUser)
    .withPassword(pgPass)
    .withDatabase(pgDb)
    .start();

  const pgHost = postgres.getHost();
  const pgPort = postgres.getPort();

  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(pgUser)}:${encodeURIComponent(pgPass)}@${pgHost}:${pgPort}/${pgDb}?schema=public`;
  
  // Start Redis
  const redis = await new RedisContainer('redis:7-alpine').start();
  process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getPort()}`;

  // Apply Prisma schema to test DB
  execSync('pnpm exec prisma db push --force-reset', { stdio: 'inherit' });

  // Return teardown to stop containers when tests finish
  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}