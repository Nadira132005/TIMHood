import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler';
import { servicesController } from './services.controller';

export const servicesRouter = Router();

servicesRouter.get('/', asyncHandler(servicesController.getOverview));
