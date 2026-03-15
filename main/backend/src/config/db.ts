import mongoose from 'mongoose';
import { env } from './env';
import { ensureCommunityIndexes } from '../modules/communities/community-indexes';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  await ensureCommunityIndexes();
}
