"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riddlesService = void 0;
const riddles_model_1 = require("./riddles.model");
exports.riddlesService = {
    async getOverview() {
        const [riddles, responses] = await Promise.all([
            riddles_model_1.Riddle.countDocuments(),
            riddles_model_1.RiddleResponse.countDocuments()
        ]);
        return {
            module: 'riddles',
            status: 'ready',
            totals: { riddles, responses }
        };
    }
};
