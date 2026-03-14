import { Riddle, RiddleResponse } from './riddles.model';

export const riddlesService = {
  async getOverview() {
    const [riddles, responses] = await Promise.all([
      Riddle.countDocuments(),
      RiddleResponse.countDocuments()
    ]);

    return {
      module: 'riddles',
      status: 'ready',
      totals: { riddles, responses }
    };
  }
};
