import { Request, Response } from 'express';

import { eventsService } from './events.service';

export const eventsController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await eventsService.getOverview();
    return res.status(200).json(result);
  }
};
