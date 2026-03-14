"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authContext = authContext;
function authContext(req, _res, next) {
    const userId = req.header('x-user-id') || null;
    req.auth = {
        userId,
        isAuthenticated: Boolean(userId)
    };
    next();
}
