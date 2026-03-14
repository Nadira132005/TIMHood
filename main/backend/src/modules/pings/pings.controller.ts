import { Request, Response } from 'express';

import { pingsService } from './pings.service';

export const pingsController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await pingsService.getOverview();
    return res.status(200).json(result);
  }
};
