import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth';
import { asyncHandler } from '../../shared/utils/async-handler';
import { communitiesController } from './communities.controller';

export const communitiesRouter = Router();

communitiesRouter.get('/', asyncHandler(communitiesController.getOverview));
communitiesRouter.get('/my', requireAuth, asyncHandler(communitiesController.getDashboard));
communitiesRouter.get('/discover', requireAuth, asyncHandler(communitiesController.discoverGroups));
communitiesRouter.get('/invites/pending', requireAuth, asyncHandler(communitiesController.getPendingGroupInvites));
communitiesRouter.get('/:communityId', requireAuth, asyncHandler(communitiesController.getGroupDetail));
communitiesRouter.get('/:communityId/chat', requireAuth, asyncHandler(communitiesController.getGroupChat));
communitiesRouter.post('/private', requireAuth, asyncHandler(communitiesController.createPrivateGroup));
communitiesRouter.post('/invites/:inviteId/respond', requireAuth, asyncHandler(communitiesController.respondToGroupInvite));
communitiesRouter.get('/:communityId/members', requireAuth, asyncHandler(communitiesController.getGroupMembers));
communitiesRouter.post('/:communityId/join', requireAuth, asyncHandler(communitiesController.joinGroup));
communitiesRouter.post('/:communityId/messages', requireAuth, asyncHandler(communitiesController.sendGroupMessage));
communitiesRouter.post(
  '/:communityId/invite',
  requireAuth,
  asyncHandler(communitiesController.inviteToPrivateGroup)
);
communitiesRouter.post(
  '/:communityId/admins/:memberUserId',
  requireAuth,
  asyncHandler(communitiesController.promoteMemberToAdmin)
);
