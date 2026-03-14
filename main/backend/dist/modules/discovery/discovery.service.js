"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoveryService = void 0;
const discovery_model_1 = require("./discovery.model");
exports.discoveryService = {
    async getOverview() {
        const [feedItems, openEvents, servicesRows] = await Promise.all([
            discovery_model_1.CommunityFeedItem.countDocuments(),
            discovery_model_1.OpenEventProjection.countDocuments(),
            discovery_model_1.ServicesDiscoveryProjection.countDocuments()
        ]);
        return {
            module: 'discovery',
            status: 'ready',
            totals: { feedItems, openEvents, servicesRows }
        };
    }
};
