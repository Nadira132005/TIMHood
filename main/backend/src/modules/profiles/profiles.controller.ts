import { Request, Response } from 'express';

import { profilesService } from './profiles.service';

export const profilesController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await profilesService.getOverview();
    return res.status(200).json(result);
  }
};
