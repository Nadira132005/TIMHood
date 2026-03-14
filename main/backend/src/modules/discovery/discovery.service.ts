import {
  CommunityFeedItem,
  OpenEventProjection,
  ServicesDiscoveryProjection
} from './discovery.model';

export const discoveryService = {
  async getOverview() {
    const [feedItems, openEvents, servicesRows] = await Promise.all([
      CommunityFeedItem.countDocuments(),
      OpenEventProjection.countDocuments(),
      ServicesDiscoveryProjection.countDocuments()
    ]);

    return {
      module: 'discovery',
      status: 'ready',
      totals: { feedItems, openEvents, servicesRows }
    };
  }
};
