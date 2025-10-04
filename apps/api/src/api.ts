import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { logger } from './logger';
import { queues } from './queue';
import routes from './routes';
import healthRoutes from './routes/health';

export function createApi() {
  const app = express();
  // Reduce security in development (was added for Bull Board)
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  } else {
    app.use(helmet({
      hsts: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));
  }
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Mount all routes
  app.use('/api', routes);
  app.use('/health', healthRoutes); // Health check at root level for easier access

  // Bull Board setup for queue monitoring (only in non-test environments)
  if (process.env.NODE_ENV !== 'test') {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: Array.from(queues.values()).map(queue => new BullMQAdapter(queue)),
      serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter()); // Bull Board dashboard
  }

  return app;
}

export async function startApi() {
  const app = createApi();
  await new Promise<void>((resolve) => {
    app.listen(Number(process.env.PORT || '3000'), () => {
      logger.info({ port: process.env.PORT || '3000' }, 'API listening');
      resolve();
    });
  });
}
