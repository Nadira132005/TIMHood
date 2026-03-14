"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
function requireAuth(req, res, next) {
    if (!req.auth?.isAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}
