import { NextFunction, Request, Response } from 'express';

export function authContext(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.header('x-user-id') || null;
  req.auth = {
    userId,
    isAuthenticated: Boolean(userId)
  };
  next();
}
