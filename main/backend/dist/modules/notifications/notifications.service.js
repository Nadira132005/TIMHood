"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsService = void 0;
const notifications_model_1 = require("./notifications.model");
exports.notificationsService = {
    async getOverview() {
        const [notifications, auditLogs] = await Promise.all([
            notifications_model_1.Notification.countDocuments(),
            notifications_model_1.AuditLog.countDocuments()
        ]);
        return {
            module: 'notifications',
            status: 'ready',
            totals: { notifications, auditLogs }
        };
    }
};
