import { NextFunction, Request, Response } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): Response | void {
  if (!req.auth?.isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
