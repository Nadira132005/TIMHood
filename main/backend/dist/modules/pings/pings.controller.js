"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingsController = void 0;
const pings_service_1 = require("./pings.service");
exports.pingsController = {
    async getOverview(_req, res) {
        const result = await pings_service_1.pingsService.getOverview();
        return res.status(200).json(result);
    }
};
