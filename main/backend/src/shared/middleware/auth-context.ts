import { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../utils/auth-token";

export function authContext(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const tokenResult = bearerToken ? verifyAuthToken(bearerToken) : null;
  const userId =
    tokenResult?.valid ? tokenResult.userId : req.header("x-user-id") || null;

  req.auth = {
    userId,
    isAuthenticated: Boolean(userId),
    tokenExpiresAt: tokenResult?.valid ? tokenResult.expiresAt : undefined,
  };
  next();
}
