import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { logger } from './logger';
import routes from './routes';
import healthRoutes from './routes/health';

export function createApi() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Mount all routes
  app.use('/api', routes);
  app.use('/health', healthRoutes); // Health check at root level for easier access

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
