import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth';
import { asyncHandler } from '../../shared/utils/async-handler';
import { identityController } from './identity.controller';

export const identityRouter = Router();

identityRouter.post('/demo-login', asyncHandler(identityController.loginWithDemoCan));
identityRouter.post('/nfc-login', asyncHandler(identityController.loginWithNfc));
identityRouter.get('/users/:userId', asyncHandler(identityController.getPublicProfile));

identityRouter.use(requireAuth);
identityRouter.get('/me', asyncHandler(identityController.getMe));
identityRouter.get('/proof-status', asyncHandler(identityController.getProofStatus));
identityRouter.post('/proof-of-work', asyncHandler(identityController.submitProofOfWork));
identityRouter.post('/home-address', asyncHandler(identityController.saveHomeAddress));
identityRouter.post('/bio', asyncHandler(identityController.saveBio));
identityRouter.put('/locations', asyncHandler(identityController.upsertLocations));
