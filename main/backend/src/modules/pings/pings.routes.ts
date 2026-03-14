import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { pingsController } from './pings.controller';

export const pingsRouter = Router();

pingsRouter.get('/', asyncHandler(pingsController.getOverview));
