import { Request, Response } from 'express';

import { discoveryService } from './discovery.service';

export const discoveryController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await discoveryService.getOverview();
    return res.status(200).json(result);
  }
};
