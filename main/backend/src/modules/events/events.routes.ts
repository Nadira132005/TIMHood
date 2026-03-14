import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { eventsController } from './events.controller';

export const eventsRouter = Router();

eventsRouter.get('/', asyncHandler(eventsController.getOverview));
