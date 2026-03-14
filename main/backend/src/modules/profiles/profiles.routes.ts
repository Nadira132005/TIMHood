import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { profilesController } from './profiles.controller';

export const profilesRouter = Router();

profilesRouter.get('/', asyncHandler(profilesController.getOverview));
