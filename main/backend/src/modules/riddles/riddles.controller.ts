import { Request, Response } from 'express';

import { riddlesService } from './riddles.service';

export const riddlesController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await riddlesService.getOverview();
    return res.status(200).json(result);
  }
};
