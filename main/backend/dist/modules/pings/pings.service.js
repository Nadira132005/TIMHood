"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingsService = void 0;
const pings_model_1 = require("./pings.model");
exports.pingsService = {
    async getOverview() {
        const [pings, responses, quotaDocs] = await Promise.all([
            pings_model_1.Ping.countDocuments(),
            pings_model_1.PingResponse.countDocuments(),
            pings_model_1.PingQuotaUsage.countDocuments()
        ]);
        return {
            module: 'pings',
            status: 'ready',
            totals: { pings, responses, quotaDocs }
        };
    }
};
