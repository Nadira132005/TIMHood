"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsController = void 0;
const events_service_1 = require("./events.service");
exports.eventsController = {
    async getOverview(_req, res) {
        const result = await events_service_1.eventsService.getOverview();
        return res.status(200).json(result);
    }
};
