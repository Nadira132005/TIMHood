import { Request, Response } from 'express';

import { communitiesService } from './communities.service';

export const communitiesController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await communitiesService.getOverview();
    return res.status(200).json(result);
  }
};
