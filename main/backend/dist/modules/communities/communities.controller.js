"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communitiesController = void 0;
const communities_service_1 = require("./communities.service");
exports.communitiesController = {
    async getOverview(_req, res) {
        const result = await communities_service_1.communitiesService.getOverview();
        return res.status(200).json(result);
    }
};
