import { Router } from 'express';

import { protectedRoute } from '../../shared/middleware/protected-route';
import { asyncHandler } from '../../shared/utils/async-handler';
import { communitiesController } from './communities.controller';

export const communitiesRouter = Router();

communitiesRouter.get('/', asyncHandler(communitiesController.getOverview));
communitiesRouter.get('/my', ...protectedRoute, asyncHandler(communitiesController.getDashboard));
communitiesRouter.get('/discover', ...protectedRoute, asyncHandler(communitiesController.discoverGroups));
communitiesRouter.get('/invites/pending', ...protectedRoute, asyncHandler(communitiesController.getPendingGroupInvites));
communitiesRouter.post('/', ...protectedRoute, asyncHandler(communitiesController.createGroup));
communitiesRouter.get('/:communityId', ...protectedRoute, asyncHandler(communitiesController.getGroupDetail));
communitiesRouter.get('/:communityId/chat', ...protectedRoute, asyncHandler(communitiesController.getGroupChat));
communitiesRouter.post('/invites/:inviteId/respond', ...protectedRoute, asyncHandler(communitiesController.respondToGroupInvite));
communitiesRouter.get('/:communityId/members', ...protectedRoute, asyncHandler(communitiesController.getGroupMembers));
communitiesRouter.post('/:communityId/join', ...protectedRoute, asyncHandler(communitiesController.joinGroup));
communitiesRouter.post('/:communityId/leave', ...protectedRoute, asyncHandler(communitiesController.leaveGroup));
communitiesRouter.delete('/:communityId', ...protectedRoute, asyncHandler(communitiesController.deleteGroup));
communitiesRouter.post('/:communityId/messages', ...protectedRoute, asyncHandler(communitiesController.sendGroupMessage));
communitiesRouter.post('/:communityId/events', ...protectedRoute, asyncHandler(communitiesController.createGroupEvent));
communitiesRouter.post(
  '/:communityId/events/:eventMessageId/approve',
  ...protectedRoute,
  asyncHandler(communitiesController.approveGroupEvent)
);
communitiesRouter.post(
  '/:communityId/events/:eventMessageId/reject',
  ...protectedRoute,
  asyncHandler(communitiesController.rejectGroupEvent)
);
communitiesRouter.post(
  '/:communityId/events/:eventMessageId/attendance',
  ...protectedRoute,
  asyncHandler(communitiesController.toggleEventAttendance)
);
communitiesRouter.post(
  '/:communityId/invite',
  ...protectedRoute,
  asyncHandler(communitiesController.inviteToPrivateGroup)
);
communitiesRouter.post(
  '/:communityId/admins/:memberUserId',
  ...protectedRoute,
  asyncHandler(communitiesController.promoteMemberToAdmin)
);
