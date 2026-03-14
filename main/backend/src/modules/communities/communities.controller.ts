import { Request, Response } from 'express';

import { communitiesService } from './communities.service';

export const communitiesController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await communitiesService.getOverview();
    return res.status(200).json(result);
  },

  async getDashboard(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.getDashboard(userId);
    return res.status(200).json(result);
  },

  async discoverGroups(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const neighborhood =
      typeof req.query.neighborhood === 'string' ? req.query.neighborhood : undefined;
    const result = await communitiesService.discoverForUserInNeighborhood(userId, neighborhood);
    return res.status(200).json(result);
  },

  async joinGroup(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.joinGroup(userId, req.params.communityId);
    return res.status(200).json(result);
  },

  async getGroupDetail(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.getGroupDetail(userId, req.params.communityId);
    return res.status(200).json(result);
  },

  async getGroupChat(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.getGroupChat(userId, req.params.communityId);
    return res.status(200).json(result);
  },

  async sendGroupMessage(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.sendGroupMessage(userId, req.params.communityId, {
      text: req.body?.text,
      imageBase64: req.body?.imageBase64
    });
    return res.status(201).json(result);
  },

  async createGroup(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.createGroup(userId, {
      name: String(req.body?.name ?? ''),
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      memberUserIds: Array.isArray(req.body?.memberUserIds) ? req.body.memberUserIds : [],
      visibility: req.body?.visibility === 'private' ? 'private' : 'public'
    });

    return res.status(201).json(result);
  },

  async getGroupMembers(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.getGroupMembers(userId, req.params.communityId);
    return res.status(200).json(result);
  },

  async promoteMemberToAdmin(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.promoteMemberToAdmin(
      userId,
      req.params.communityId,
      req.params.memberUserId
    );
    return res.status(200).json(result);
  },

  async inviteToPrivateGroup(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.inviteToPrivateGroup(
      userId,
      req.params.communityId,
      String(req.body?.invitedUserId ?? '')
    );
    return res.status(200).json(result);
  },

  async getPendingGroupInvites(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.getPendingGroupInvites(userId);
    return res.status(200).json(result);
  },

  async respondToGroupInvite(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.respondToGroupInvite(
      userId,
      req.params.inviteId,
      Boolean(req.body?.accept)
    );
    return res.status(200).json(result);
  },

  async leaveGroup(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.leaveGroup(userId, req.params.communityId);
    return res.status(200).json(result);
  },

  async deleteGroup(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await communitiesService.deleteGroup(userId, req.params.communityId);
    return res.status(200).json(result);
  }
};
