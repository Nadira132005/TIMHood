import { Router } from "express";

import { authContext } from "../../shared/middleware/auth-context";
import { protectedRoute } from "../../shared/middleware/protected-route";
import { asyncHandler } from "../../shared/utils/async-handler";
import { identityController } from "./identity.controller";

export const identityRouter = Router();

identityRouter.post(
  "/demo-login",
  asyncHandler(identityController.loginWithDemoCan),
);
identityRouter.post(
  "/nfc-login",
  asyncHandler(identityController.loginWithNfc),
);
identityRouter.get(
  "/users/:userId",
  authContext,
  asyncHandler(identityController.getPublicProfile),
);

identityRouter.use(...protectedRoute);
identityRouter.get("/me", asyncHandler(identityController.getMe));
identityRouter.put(
  "/locations",
  asyncHandler(identityController.upsertLocations),
);

identityRouter.post(
  "/home-address",
  asyncHandler(identityController.saveHomeAddress),
);
identityRouter.post("/bio", asyncHandler(identityController.saveBio));
identityRouter.post("/privacy", asyncHandler(identityController.savePrivacy));
