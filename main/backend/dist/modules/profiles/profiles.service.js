"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesService = void 0;
const profiles_model_1 = require("./profiles.model");
exports.profilesService = {
    async getOverview() {
        const [profiles, answers, questions] = await Promise.all([
            profiles_model_1.Profile.countDocuments(),
            profiles_model_1.ProfileAnswer.countDocuments(),
            profiles_model_1.Question.countDocuments({ is_active: true })
        ]);
        return {
            module: 'profiles',
            status: 'ready',
            totals: { profiles, answers, activeQuestions: questions }
        };
    }
};
