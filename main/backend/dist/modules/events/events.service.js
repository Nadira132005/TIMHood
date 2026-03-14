"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsService = void 0;
const events_model_1 = require("./events.model");
exports.eventsService = {
    async getOverview() {
        const [events, requests, shares, participants] = await Promise.all([
            events_model_1.Event.countDocuments(),
            events_model_1.EventParticipationRequest.countDocuments(),
            events_model_1.EventShare.countDocuments(),
            events_model_1.EventParticipant.countDocuments()
        ]);
        return {
            module: 'events',
            status: 'ready',
            totals: { events, requests, shares, participants }
        };
    }
};
