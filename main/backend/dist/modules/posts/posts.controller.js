"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postsController = void 0;
const posts_service_1 = require("./posts.service");
exports.postsController = {
    async getOverview(_req, res) {
        const result = await posts_service_1.postsService.getOverview();
        return res.status(200).json(result);
    }
};
