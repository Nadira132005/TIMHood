import { Community, CommunityAccessPolicy, CommunityMembership } from './communities.model';

export const communitiesService = {
  async getOverview() {
    const [communities, memberships, restrictedPolicies] = await Promise.all([
      Community.countDocuments(),
      CommunityMembership.countDocuments(),
      CommunityAccessPolicy.countDocuments({ is_active: true })
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
