import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { notificationsController } from './notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.get('/', asyncHandler(notificationsController.getOverview));
