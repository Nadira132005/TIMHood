import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { apiRouter } from './modules';
import { authContext } from './shared/middleware/auth-context';
import { errorHandler } from './shared/middleware/error-handler';
import { notFound } from './shared/middleware/not-found';

export function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.frontendOrigin }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(authContext);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
