import { Request, Response } from 'express';

import { socialService } from './social.service';

export const socialController = {
  async getPendingFriendRequests(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await socialService.getPendingFriendRequests(userId);
    return res.status(200).json(result);
  },

  async getRelationship(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await socialService.getRelationship(userId, req.params.userId);
    return res.status(200).json(result);
  },

  async sendFriendRequest(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await socialService.sendFriendRequest(userId, req.params.userId);
    return res.status(200).json(result);
  },

  async respondToFriendRequest(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await socialService.respondToFriendRequest(
      userId,
      req.params.userId,
      Boolean(req.body?.accept)
    );
    return res.status(200).json(result);
  },

  async getDirectChat(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await socialService.getDirectChat(userId, req.params.userId);
    return res.status(200).json(result);
  },

  async sendDirectMessage(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await socialService.sendDirectMessage(userId, req.params.userId, {
      text: req.body?.text,
      imageBase64: req.body?.imageBase64
    });
    return res.status(201).json(result);
  }
};
