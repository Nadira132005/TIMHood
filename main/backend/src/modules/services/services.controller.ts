import { Request, Response } from 'express';

import { servicesService } from './services.service';

export const servicesController = {
  async getOverview(_req: Request, res: Response): Promise<Response> {
    const result = await servicesService.getOverview();
    return res.status(200).json(result);
  }
};
