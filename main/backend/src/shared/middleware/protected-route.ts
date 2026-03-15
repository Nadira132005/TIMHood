import { authContext } from "./auth-context";
import { requireAuth } from "./require-auth";

export const protectedRoute = [authContext, requireAuth] as const;
