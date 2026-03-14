import { buildApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  await connectDb();
  const app = buildApp();

  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
