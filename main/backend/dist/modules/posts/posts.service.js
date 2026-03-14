"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postsService = void 0;
const posts_model_1 = require("./posts.model");
exports.postsService = {
    async getOverview() {
        const [posts, comments, reactions, polls] = await Promise.all([
            posts_model_1.Post.countDocuments(),
            posts_model_1.PostComment.countDocuments(),
            posts_model_1.PostReaction.countDocuments(),
            posts_model_1.Poll.countDocuments()
        ]);
        return {
            module: 'posts',
            status: 'ready',
            totals: { posts, comments, reactions, polls }
        };
    }
};
