import { Poll, Post, PostComment, PostReaction } from './posts.model';

export const postsService = {
  async getOverview() {
    const [posts, comments, reactions, polls] = await Promise.all([
      Post.countDocuments(),
      PostComment.countDocuments(),
      PostReaction.countDocuments(),
      Poll.countDocuments()
    ]);

    return {
      module: 'posts',
      status: 'ready',
      totals: { posts, comments, reactions, polls }
    };
  }
};
