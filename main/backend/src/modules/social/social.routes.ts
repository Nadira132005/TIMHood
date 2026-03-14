import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth';
import { asyncHandler } from '../../shared/utils/async-handler';
import { socialController } from './social.controller';

export const socialRouter = Router();

socialRouter.use(requireAuth);
socialRouter.get('/friend-requests/pending', asyncHandler(socialController.getPendingFriendRequests));
socialRouter.get('/relationships/:userId', asyncHandler(socialController.getRelationship));
socialRouter.post('/friend-requests/:userId', asyncHandler(socialController.sendFriendRequest));
socialRouter.post('/friend-requests/:userId/respond', asyncHandler(socialController.respondToFriendRequest));
socialRouter.get('/direct-chats/:userId', asyncHandler(socialController.getDirectChat));
socialRouter.post('/direct-chats/:userId/messages', asyncHandler(socialController.sendDirectMessage));
