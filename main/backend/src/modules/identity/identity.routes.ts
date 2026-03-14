import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth';
import { asyncHandler } from '../../shared/utils/async-handler';
import { identityController } from './identity.controller';

export const identityRouter = Router();

identityRouter.use(requireAuth);
identityRouter.get('/proof-status', asyncHandler(identityController.getProofStatus));
identityRouter.post('/proof-of-work', asyncHandler(identityController.submitProofOfWork));
identityRouter.put('/locations', asyncHandler(identityController.upsertLocations));
