import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { riddlesController } from './riddles.controller';

export const riddlesRouter = Router();

riddlesRouter.get('/', asyncHandler(riddlesController.getOverview));
