import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth';
import { asyncHandler } from '../../shared/utils/async-handler';
import { neighborhoodsController } from './neighborhoods.controller';

export const neighborhoodsRouter = Router();

neighborhoodsRouter.get('/', asyncHandler(neighborhoodsController.listNeighborhoods));
neighborhoodsRouter.get('/my-chat', requireAuth, asyncHandler(neighborhoodsController.getMyNeighborhoodChat));
neighborhoodsRouter.post(
  '/my-chat/messages',
  requireAuth,
  asyncHandler(neighborhoodsController.sendMyNeighborhoodMessage)
);
