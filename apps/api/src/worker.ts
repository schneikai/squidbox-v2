import express from 'express';
import { env } from './env';
import { logger } from './logger';
import { startDownloadWorker } from './workers/downloadWorker';
import { startTwitterWorker } from './workers/twitterWorker';

function createWorkerServer() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  return app;
}

export async function startWorker() {
  const app = createWorkerServer();

  // Start individual workers
  // Note: Workers are started immediately because BullMQ workers need to be running
  // to continuously poll Redis for jobs. If we don't start them, jobs will queue up
  // but never get processed. Workers run in the background and process jobs as they arrive.
  startDownloadWorker();
  startTwitterWorker();

  await new Promise<void>((resolve) => {
    app.listen(Number(env.WORKER_PORT), () => {
      logger.info({ port: env.WORKER_PORT }, 'Worker listening');
      resolve();
    });
  });
}