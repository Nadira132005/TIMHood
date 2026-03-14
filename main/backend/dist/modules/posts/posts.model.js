"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollVote = exports.Poll = exports.PostReaction = exports.PostComment = exports.Post = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("../../shared/constants/enums");
const postSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    author_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    author_visibility: { type: String, enum: enums_1.AuthorVisibilities, default: 'public', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    content_kind: {
        type: String,
        enum: ['announcement', 'news', 'blog', 'question', 'poll'],
        required: true
    },
    interaction_mode: {
        type: String,
        enum: ['normal', 'reactions_only', 'limited_replies', 'one_reply_per_user', 'poll_only'],
        default: 'normal',
        required: true
    },
    max_replies_per_user: { type: Number },
    status: {
        type: String,
        enum: enums_1.ContentModerationStatuses,
        default: 'published',
        required: true
    },
    reactions_count: { type: Number, default: 0, required: true },
    comments_count: { type: Number, default: 0, required: true },
    poll_id: { type: mongoose_1.Schema.Types.ObjectId },
    published_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
postSchema.index({ community_id: 1, status: 1, created_at: -1 });
postSchema.index({ author_user_id: 1, created_at: -1 });
const postCommentSchema = new mongoose_1.Schema({
    post_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    author_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    author_visibility: { type: String, enum: enums_1.AuthorVisibilities, default: 'public', required: true },
    parent_comment_id: { type: mongoose_1.Schema.Types.ObjectId },
    body: { type: String, required: true },
    status: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible', required: true },
    is_golden: { type: Boolean, default: false, required: true },
    golden_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    golden_at: { type: Date },
    reactions_count: { type: Number, default: 0, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
postCommentSchema.index({ post_id: 1, status: 1, created_at: 1 });
postCommentSchema.index({ community_id: 1, created_at: -1 });
postCommentSchema.index({ post_id: 1, author_user_id: 1, created_at: 1 });
const postReactionSchema = new mongoose_1.Schema({
    target_type: { type: String, enum: ['post', 'comment'], required: true },
    target_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    reaction_type: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
postReactionSchema.index({ target_type: 1, target_id: 1, user_id: 1 }, { unique: true });
postReactionSchema.index({ target_type: 1, target_id: 1, reaction_type: 1 });
const pollSchema = new mongoose_1.Schema({
    post_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, unique: true, index: true },
    question: { type: String, required: true },
    options: [
        {
            option_id: { type: String, required: true },
            label: { type: String, required: true }
        }
    ],
    allow_multi_select: { type: Boolean, default: false, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', required: true },
    closes_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
pollSchema.index({ status: 1, closes_at: 1 });
const pollVoteSchema = new mongoose_1.Schema({
    poll_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    option_ids: { type: [String], required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
pollVoteSchema.index({ poll_id: 1, user_id: 1 }, { unique: true });
pollVoteSchema.index({ poll_id: 1, created_at: 1 });
exports.Post = mongoose_1.default.models.Post || mongoose_1.default.model('Post', postSchema);
exports.PostComment = mongoose_1.default.models.PostComment ||
    mongoose_1.default.model('PostComment', postCommentSchema);
exports.PostReaction = mongoose_1.default.models.PostReaction ||
    mongoose_1.default.model('PostReaction', postReactionSchema);
exports.Poll = mongoose_1.default.models.Poll || mongoose_1.default.model('Poll', pollSchema);
exports.PollVote = mongoose_1.default.models.PollVote ||
    mongoose_1.default.model('PollVote', pollVoteSchema);
