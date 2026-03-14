import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { communitiesController } from './communities.controller';

export const communitiesRouter = Router();

communitiesRouter.get('/', asyncHandler(communitiesController.getOverview));
