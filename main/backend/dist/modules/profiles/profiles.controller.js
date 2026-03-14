"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesController = void 0;
const profiles_service_1 = require("./profiles.service");
exports.profilesController = {
    async getOverview(_req, res) {
        const result = await profiles_service_1.profilesService.getOverview();
        return res.status(200).json(result);
    }
};
