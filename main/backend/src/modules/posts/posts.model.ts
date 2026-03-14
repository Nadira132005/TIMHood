import mongoose, { Model, Schema } from 'mongoose';

import { AuthorVisibilities, ContentModerationStatuses } from '../../shared/constants/enums';

interface IPost {
  community_id: mongoose.Types.ObjectId;
  author_user_id: mongoose.Types.ObjectId;
  author_visibility: (typeof AuthorVisibilities)[number];
  title: string;
  description: string;
  content_kind: 'announcement' | 'news' | 'blog' | 'question' | 'poll';
  interaction_mode:
    | 'normal'
    | 'reactions_only'
    | 'limited_replies'
    | 'one_reply_per_user'
    | 'poll_only';
  max_replies_per_user?: number;
  status: (typeof ContentModerationStatuses)[number];
  reactions_count: number;
  comments_count: number;
  poll_id?: mongoose.Types.ObjectId;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface IPostComment {
  post_id: mongoose.Types.ObjectId;
  community_id: mongoose.Types.ObjectId;
  author_user_id: mongoose.Types.ObjectId;
  author_visibility: (typeof AuthorVisibilities)[number];
  parent_comment_id?: mongoose.Types.ObjectId;
  body: string;
  status: 'visible' | 'hidden' | 'removed';
  is_golden: boolean;
  golden_by_user_id?: mongoose.Types.ObjectId;
  golden_at?: Date;
  reactions_count: number;
  created_at: Date;
  updated_at: Date;
}

interface IPostReaction {
  target_type: 'post' | 'comment';
  target_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  reaction_type: string;
  created_at: Date;
  updated_at: Date;
}

interface IPoll {
  post_id: mongoose.Types.ObjectId;
  question: string;
  options: Array<{ option_id: string; label: string }>;
  allow_multi_select: boolean;
  status: 'open' | 'closed';
  closes_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface IPollVote {
  poll_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  option_ids: string[];
  created_at: Date;
  updated_at: Date;
}

const postSchema = new Schema<IPost>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    author_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    author_visibility: { type: String, enum: AuthorVisibilities, default: 'public', required: true },
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
      enum: ContentModerationStatuses,
      default: 'published',
      required: true
    },
    reactions_count: { type: Number, default: 0, required: true },
    comments_count: { type: Number, default: 0, required: true },
    poll_id: { type: Schema.Types.ObjectId },
    published_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

postSchema.index({ community_id: 1, status: 1, created_at: -1 });
postSchema.index({ author_user_id: 1, created_at: -1 });

const postCommentSchema = new Schema<IPostComment>(
  {
    post_id: { type: Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    author_user_id: { type: Schema.Types.ObjectId, required: true },
    author_visibility: { type: String, enum: AuthorVisibilities, default: 'public', required: true },
    parent_comment_id: { type: Schema.Types.ObjectId },
    body: { type: String, required: true },
    status: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible', required: true },
    is_golden: { type: Boolean, default: false, required: true },
    golden_by_user_id: { type: Schema.Types.ObjectId },
    golden_at: { type: Date },
    reactions_count: { type: Number, default: 0, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

postCommentSchema.index({ post_id: 1, status: 1, created_at: 1 });
postCommentSchema.index({ community_id: 1, created_at: -1 });
postCommentSchema.index({ post_id: 1, author_user_id: 1, created_at: 1 });

const postReactionSchema = new Schema<IPostReaction>(
  {
    target_type: { type: String, enum: ['post', 'comment'], required: true },
    target_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    reaction_type: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

postReactionSchema.index({ target_type: 1, target_id: 1, user_id: 1 }, { unique: true });
postReactionSchema.index({ target_type: 1, target_id: 1, reaction_type: 1 });

const pollSchema = new Schema<IPoll>(
  {
    post_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

pollSchema.index({ status: 1, closes_at: 1 });

const pollVoteSchema = new Schema<IPollVote>(
  {
    poll_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    option_ids: { type: [String], required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

pollVoteSchema.index({ poll_id: 1, user_id: 1 }, { unique: true });
pollVoteSchema.index({ poll_id: 1, created_at: 1 });

export const Post: Model<IPost> =
  (mongoose.models.Post as Model<IPost>) || mongoose.model<IPost>('Post', postSchema);

export const PostComment: Model<IPostComment> =
  (mongoose.models.PostComment as Model<IPostComment>) ||
  mongoose.model<IPostComment>('PostComment', postCommentSchema);

export const PostReaction: Model<IPostReaction> =
  (mongoose.models.PostReaction as Model<IPostReaction>) ||
  mongoose.model<IPostReaction>('PostReaction', postReactionSchema);

export const Poll: Model<IPoll> =
  (mongoose.models.Poll as Model<IPoll>) || mongoose.model<IPoll>('Poll', pollSchema);

export const PollVote: Model<IPollVote> =
  (mongoose.models.PollVote as Model<IPollVote>) ||
  mongoose.model<IPollVote>('PollVote', pollVoteSchema);
