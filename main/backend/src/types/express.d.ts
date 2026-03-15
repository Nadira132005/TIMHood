import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string | null;
        isAuthenticated: boolean;
        tokenExpiresAt?: string;
      };
    }
  }
}

export {};
