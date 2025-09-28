import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

// Start ephemeral Postgres + Redis for tests, set env, push schema, and return teardown
export default async function () {
  // Required by Prisma CLI for non-interactive reset/push in CI/tests
  process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = 'yes';
  // Workaround for Docker credential helper issues on some macOS setups
  process.env.TESTCONTAINERS_DOCKER_AUTH_CONFIG = process.env.TESTCONTAINERS_DOCKER_AUTH_CONFIG || '{}';

  // Configure Postgres
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

  const databaseUrl = `postgresql://${encodeURIComponent(pgUser)}:${encodeURIComponent(pgPass)}@${pgHost}:${pgPort}/${pgDb}?schema=public`;
  console.log("globalSetup:databaseUrl", databaseUrl)
  
  // Start Redis
  const redis = await new RedisContainer('redis:7-alpine').start();
  const redisUrl = `redis://${redis.getHost()}:${redis.getPort()}`;

  // Minimal secrets required by env schema
  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = redisUrl;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-dev-secret-dev-secret-123456';
  process.env.NODE_ENV = 'test';

  // Apply Prisma schema to test DB
  execSync('pnpm exec prisma db push --force-reset', { stdio: 'inherit' });

  // Return teardown to stop containers when tests finish
  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}