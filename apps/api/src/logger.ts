import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  // Silence logs during tests; debug in development; info in production
  level: isProd ? 'info' : isTest ? 'silent' : 'debug',
  // Pretty transport only in development (not in test or production)
  transport: !isProd && !isTest
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      }
    : undefined,
});
