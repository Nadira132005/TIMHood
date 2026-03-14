import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { postsController } from './posts.controller';

export const postsRouter = Router();

postsRouter.get('/', asyncHandler(postsController.getOverview));
