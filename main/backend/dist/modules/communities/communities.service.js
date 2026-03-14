"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communitiesService = void 0;
const communities_model_1 = require("./communities.model");
exports.communitiesService = {
    async getOverview() {
        const [communities, memberships, restrictedPolicies] = await Promise.all([
            communities_model_1.Community.countDocuments(),
            communities_model_1.CommunityMembership.countDocuments(),
            communities_model_1.CommunityAccessPolicy.countDocuments({ is_active: true })
        ]);
        return {
            module: 'communities',
            status: 'ready',
            totals: {
                communities,
                memberships,
                restrictedPolicies
            }
        };
    }
};
