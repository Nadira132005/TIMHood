import { Request, Response } from 'express';

import { postsService } from './posts.service';

export const postsController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await postsService.getOverview();
    return res.status(200).json(result);
  }
};
