import { Router } from 'express';

import { protectedRoute } from '../../shared/middleware/protected-route';
import { asyncHandler } from '../../shared/utils/async-handler';
import { neighborhoodsController } from './neighborhoods.controller';

export const neighborhoodsRouter = Router();

neighborhoodsRouter.get('/', asyncHandler(neighborhoodsController.listNeighborhoods));
neighborhoodsRouter.post('/resolve-address', ...protectedRoute, asyncHandler(neighborhoodsController.resolveAddress));
neighborhoodsRouter.get('/my-chat', ...protectedRoute, asyncHandler(neighborhoodsController.getMyNeighborhoodChat));
neighborhoodsRouter.post(
  '/my-chat/messages',
  ...protectedRoute,
  asyncHandler(neighborhoodsController.sendMyNeighborhoodMessage)
);
