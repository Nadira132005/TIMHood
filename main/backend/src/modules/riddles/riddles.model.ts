import mongoose, { Model, Schema } from 'mongoose';

import { RiddleStates } from '../../shared/constants/enums';

interface IRiddle {
  creator_type: 'system' | 'user';
  creator_user_id?: mongoose.Types.ObjectId;
  scope: 'community' | 'interest' | 'friend_direct';
  community_id?: mongoose.Types.ObjectId;
  interest_tag?: string;
  prompt: string;
  answer_format: 'single_choice' | 'multi_choice' | 'short_text';
  options?: string[];
  status: (typeof RiddleStates)[number];
  publish_at: Date;
  close_at: Date;
  moderation_status: 'approved' | 'rejected' | 'pending';
  created_at: Date;
  updated_at: Date;
}

interface IRiddleResponse {
  riddle_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  answer_payload: unknown;
  visibility: 'public' | 'friends' | 'private';
  created_at: Date;
  updated_at: Date;
}

const riddleSchema = new Schema<IRiddle>(
  {
    creator_type: { type: String, enum: ['system', 'user'], required: true },
    creator_user_id: { type: Schema.Types.ObjectId },
    scope: { type: String, enum: ['community', 'interest', 'friend_direct'], required: true },
    community_id: { type: Schema.Types.ObjectId },
    interest_tag: { type: String },
    prompt: { type: String, required: true },
    answer_format: {
      type: String,
      enum: ['single_choice', 'multi_choice', 'short_text'],
      required: true
    },
    options: { type: [String], default: undefined },
    status: { type: String, enum: RiddleStates, default: 'scheduled', required: true },
    publish_at: { type: Date, required: true },
    close_at: { type: Date, required: true },
    moderation_status: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'approved',
      required: true
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

riddleSchema.index({ scope: 1, status: 1, publish_at: 1 });
riddleSchema.index({ community_id: 1, status: 1, publish_at: -1 });
riddleSchema.index({ interest_tag: 1, status: 1, publish_at: -1 });

const riddleResponseSchema = new Schema<IRiddleResponse>(
  {
    riddle_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    answer_payload: { type: Schema.Types.Mixed, required: true },
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private',
      required: true
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

riddleResponseSchema.index({ riddle_id: 1, user_id: 1 }, { unique: true });
riddleResponseSchema.index({ riddle_id: 1, visibility: 1 });
riddleResponseSchema.index({ user_id: 1, created_at: -1 });

export const Riddle: Model<IRiddle> =
  (mongoose.models.Riddle as Model<IRiddle>) || mongoose.model<IRiddle>('Riddle', riddleSchema);

export const RiddleResponse: Model<IRiddleResponse> =
  (mongoose.models.RiddleResponse as Model<IRiddleResponse>) ||
  mongoose.model<IRiddleResponse>('RiddleResponse', riddleResponseSchema);
