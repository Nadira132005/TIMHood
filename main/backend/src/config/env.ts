import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timhood',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:8081',
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || 'timhood-dev-secret',
  authTokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 30),
  cscaCertsPath: process.env.CSCA_CERTS_PATH || '',
};
