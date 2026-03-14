"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riddlesController = void 0;
const riddles_service_1 = require("./riddles.service");
exports.riddlesController = {
    async getOverview(_req, res) {
        const result = await riddles_service_1.riddlesService.getOverview();
        return res.status(200).json(result);
    }
};
