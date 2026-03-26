import { Request, Response } from "express";

import { identityService } from "./identity.service";

export const identityController = {
  async createNfcChallenge(_req: Request, res: Response): Promise<Response> {
    return res.status(200).json(identityService.issueNfcChallenge());
  },

  async loginWithDemoCan(req: Request, res: Response): Promise<Response> {
    const result = await identityService.loginWithDemoCan({
      can: String(req.body?.can ?? ""),
    });

    return res.status(200).json(result);
  },

  async loginWithNfc(req: Request, res: Response): Promise<Response> {
    const result = await identityService.loginWithNfc({
      challengeId: req.body?.challengeId,
      evidence: req.body?.evidence,
    });

    return res.status(200).json(result);
  },

  async getMe(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const profile = await identityService.getFixedProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(profile);
  },

  async getPublicProfile(req: Request, res: Response): Promise<Response> {
    const profile = await identityService.getPublicProfile(
      req.params.userId,
      req.auth?.userId || undefined,
    );
    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(profile);
  },

  async upsertLocations(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const home = req.body?.home_location_point;
    if (
      !home ||
      home.type !== "Point" ||
      !Array.isArray(home.coordinates) ||
      home.coordinates.length !== 2
    ) {
      return res
        .status(400)
        .json({ error: "home_location_point GeoJSON Point is required" });
    }

    const saved = await identityService.upsertLocations(userId, req.body);
    return res.status(200).json(saved);
  },

  async saveHomeAddress(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const saved = await identityService.saveHomeAddress(userId, {
      addressLabel: req.body?.addressLabel,
      neighborhood: req.body?.neighborhood,
      location: req.body?.location,
    });

    return res.status(200).json(saved);
  },

  async saveBio(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const profile = await identityService.saveBio(
      userId,
      String(req.body?.bio ?? ""),
    );
    return res.status(200).json(profile);
  },

  async savePrivacy(req: Request, res: Response): Promise<Response> {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const profile = await identityService.savePrivacySettings(userId, {
      showPhotoToOthers: Boolean(req.body?.showPhotoToOthers),
      showAgeToOthers: Boolean(req.body?.showAgeToOthers),
    });
    return res.status(200).json(profile);
  },
};
