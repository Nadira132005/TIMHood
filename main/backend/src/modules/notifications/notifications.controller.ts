import { Request, Response } from 'express';

import { notificationsService } from './notifications.service';

export const notificationsController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await notificationsService.getOverview();
    return res.status(200).json(result);
  }
};
