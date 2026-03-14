import { Event, EventParticipant, EventParticipationRequest, EventShare } from './events.model';

export const eventsService = {
  async getOverview() {
    const [events, requests, shares, participants] = await Promise.all([
      Event.countDocuments(),
      EventParticipationRequest.countDocuments(),
      EventShare.countDocuments(),
      EventParticipant.countDocuments()
    ]);

    return {
      module: 'events',
      status: 'ready',
      totals: { events, requests, shares, participants }
    };
  }
};
