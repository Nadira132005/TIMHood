import { Request, Response } from 'express';

import { neighborhoodsService } from './neighborhoods.service';

export const neighborhoodsController = {
  async listNeighborhoods(_req: Request, res: Response): Promise<Response> {
    const result = await neighborhoodsService.listNeighborhoods();
    return res.status(200).json(result);
  },

  async resolveAddress(req: Request, res: Response): Promise<Response> {
    const result = await neighborhoodsService.resolveAddress(String(req.body?.addressLabel ?? ''));
    return res.status(200).json(result);
  },

  async getMyNeighborhoodChat(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await neighborhoodsService.getMyNeighborhoodChat(userId);
    return res.status(200).json(result);
  },

  async sendMyNeighborhoodMessage(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await neighborhoodsService.sendMyNeighborhoodMessage(userId, {
      text: req.body?.text,
      imageBase64: req.body?.imageBase64
    });
    return res.status(201).json(result);
  }
};
