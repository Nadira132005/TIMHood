import { Request, Response } from 'express';

import { identityService } from './identity.service';

export const identityController = {
  async loginWithDemoCan(req: Request, res: Response): Promise<Response> {
    const result = await identityService.loginWithDemoCan({
      can: String(req.body?.can ?? '')
    });

    return res.status(200).json(result);
  },

  async loginWithNfc(req: Request, res: Response): Promise<Response> {
    const result = await identityService.loginWithNfc({
      documentNumber: req.body?.documentNumber,
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      nationality: req.body?.nationality,
      dateOfBirth: req.body?.dateOfBirth,
      dateOfExpiry: req.body?.dateOfExpiry,
      issuingState: req.body?.issuingState,
      photoBase64: req.body?.photoBase64
    });

    return res.status(200).json(result);
  },

  async getMe(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const profile = await identityService.getFixedProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(profile);
  },

  async getPublicProfile(req: Request, res: Response): Promise<Response> {
    const profile = await identityService.getPublicProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(profile);
  },

  async getProofStatus(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const status = await identityService.getProofStatus(userId);
    if (!status) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(status);
  },

  async submitProofOfWork(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const documentNumber = req.body?.document_number;
    if (typeof documentNumber !== 'string') {
      return res.status(400).json({ error: 'document_number is required' });
    }

    const result = await identityService.submitProofOfWork(userId, documentNumber);
    return res.status(200).json(result);
  },

  async upsertLocations(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const home = req.body?.home_location_point;
    if (!home || home.type !== 'Point' || !Array.isArray(home.coordinates) || home.coordinates.length !== 2) {
      return res.status(400).json({ error: 'home_location_point GeoJSON Point is required' });
    }

    const saved = await identityService.upsertLocations(userId, req.body);
    return res.status(200).json(saved);
  },

  async saveHomeAddress(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const saved = await identityService.saveHomeAddress(userId, {
      addressLabel: req.body?.addressLabel,
      neighborhood: req.body?.neighborhood,
      location: req.body?.location
    });

    return res.status(200).json(saved);
  },

  async saveBio(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const profile = await identityService.saveBio(userId, String(req.body?.bio ?? ''));
    return res.status(200).json(profile);
  }
};
