"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = void 0;
const notifications_service_1 = require("./notifications.service");
exports.notificationsController = {
    async getOverview(_req, res) {
        const result = await notifications_service_1.notificationsService.getOverview();
        return res.status(200).json(result);
    }
};
