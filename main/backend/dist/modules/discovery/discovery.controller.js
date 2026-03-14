"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoveryController = void 0;
const discovery_service_1 = require("./discovery.service");
exports.discoveryController = {
    async getOverview(_req, res) {
        const result = await discovery_service_1.discoveryService.getOverview();
        return res.status(200).json(result);
    }
};
