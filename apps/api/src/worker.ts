import express from 'express';

import { env } from './env';
import { logger } from './logger';

export function createWorkerServer() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  return app;
}

export async function startWorker() {
  const app = createWorkerServer();
  await new Promise<void>((resolve) => {
    app.listen(Number(env.WORKER_PORT), () => {
      logger.info({ port: env.WORKER_PORT }, 'Worker listening');
      resolve();
    });
  });
}
