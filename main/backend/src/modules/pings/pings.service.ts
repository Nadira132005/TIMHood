import { Ping, PingQuotaUsage, PingResponse } from './pings.model';

export const pingsService = {
  async getOverview() {
    const [pings, responses, quotaDocs] = await Promise.all([
      Ping.countDocuments(),
      PingResponse.countDocuments(),
      PingQuotaUsage.countDocuments()
    ]);

    return {
      module: 'pings',
      status: 'ready',
      totals: { pings, responses, quotaDocs }
    };
  }
};
