import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { env } from './config/env';
import { apiRouter } from './modules';
import { errorHandler } from './shared/middleware/error-handler';
import { notFound } from './shared/middleware/not-found';

export function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.frontendOrigin }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/assets/map.png', (_req, res) => {
    res.sendFile(path.resolve(__dirname, '../../map.png'));
  });

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
