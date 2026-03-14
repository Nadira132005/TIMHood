"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const modules_1 = require("./modules");
const auth_context_1 = require("./shared/middleware/auth-context");
const error_handler_1 = require("./shared/middleware/error-handler");
const not_found_1 = require("./shared/middleware/not-found");
function buildApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({ origin: env_1.env.frontendOrigin }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use((0, morgan_1.default)(env_1.env.nodeEnv === 'production' ? 'combined' : 'dev'));
    app.use(auth_context_1.authContext);
    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    app.use('/api', modules_1.apiRouter);
    app.use(not_found_1.notFound);
    app.use(error_handler_1.errorHandler);
    return app;
}
