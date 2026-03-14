import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { discoveryController } from './discovery.controller';

export const discoveryRouter = Router();

discoveryRouter.get('/', asyncHandler(discoveryController.getOverview));
