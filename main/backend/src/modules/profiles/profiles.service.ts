import { Profile, ProfileAnswer, Question } from './profiles.model';

export const profilesService = {
  async getOverview() {
    const [profiles, answers, questions] = await Promise.all([
      Profile.countDocuments(),
      ProfileAnswer.countDocuments(),
      Question.countDocuments({ is_active: true })
    ]);

    return {
      module: 'profiles',
      status: 'ready',
      totals: { profiles, answers, activeQuestions: questions }
    };
  }
};
