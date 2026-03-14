import { buildApp } from './app';
import { connectDb } from './config/db';
import { ensureBraytimCommunitySeed } from './dev/braytim-seed';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  await connectDb();
  await ensureBraytimCommunitySeed();
  const app = buildApp();

  app.listen(env.port, env.host, () => {
    console.log(`Backend listening on ${env.host}:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
