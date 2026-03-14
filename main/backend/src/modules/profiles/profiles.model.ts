import mongoose, { Model, Schema } from 'mongoose';

interface IProfile {
  user_id: mongoose.Types.ObjectId;
  display_name: string;
  handle?: string;
  avatar_url?: string;
  bio?: string;
  visibility_level: 'public' | 'friends' | 'private';
  interests?: string[];
  onboarding_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

interface IFriendship {
  user_low_id: mongoose.Types.ObjectId;
  user_high_id: mongoose.Types.ObjectId;
  requested_by_user_id: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: Date;
  updated_at: Date;
}

interface IQuestion {
  scope: 'onboarding' | 'profile_extension' | 'riddle_template';
  style: 'ab' | 'preference' | 'absurd';
  topic: string;
  prompt: string;
  answer_format: 'single_choice' | 'multi_choice' | 'short_text';
  options?: string[];
  source: 'editorial' | 'ai';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface IProfileAnswer {
  user_id: mongoose.Types.ObjectId;
  question_id: mongoose.Types.ObjectId;
  answer_payload: unknown;
  visibility: 'public' | 'friends' | 'private';
  origin: 'onboarding' | 'manual' | 'riddle';
  riddle_id?: mongoose.Types.ObjectId;
  community_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

interface ICompatibilitySnapshot {
  user_id: mongoose.Types.ObjectId;
  other_user_id: mongoose.Types.ObjectId;
  community_id?: mongoose.Types.ObjectId;
  score: number;
  explanation_keys: string[];
  computed_at: Date;
  expires_at: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    display_name: { type: String, required: true },
    handle: { type: String, unique: true, sparse: true },
    avatar_url: { type: String },
    bio: { type: String },
    visibility_level: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
      required: true
    },
    interests: { type: [String], default: undefined },
    onboarding_completed: { type: Boolean, default: false, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const friendshipSchema = new Schema<IFriendship>(
  {
    user_low_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_high_id: { type: Schema.Types.ObjectId, required: true, index: true },
    requested_by_user_id: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending', required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

friendshipSchema.index({ user_low_id: 1, user_high_id: 1 }, { unique: true });
friendshipSchema.index({ status: 1, user_low_id: 1 });
friendshipSchema.index({ status: 1, user_high_id: 1 });

const questionSchema = new Schema<IQuestion>(
  {
    scope: { type: String, enum: ['onboarding', 'profile_extension', 'riddle_template'], required: true },
    style: { type: String, enum: ['ab', 'preference', 'absurd'], required: true },
    topic: { type: String, required: true },
    prompt: { type: String, required: true },
    answer_format: {
      type: String,
      enum: ['single_choice', 'multi_choice', 'short_text'],
      required: true
    },
    options: { type: [String], default: undefined },
    source: { type: String, enum: ['editorial', 'ai'], default: 'editorial', required: true },
    is_active: { type: Boolean, default: true, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

questionSchema.index({ scope: 1, is_active: 1 });
questionSchema.index({ topic: 1, is_active: 1 });

const profileAnswerSchema = new Schema<IProfileAnswer>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    question_id: { type: Schema.Types.ObjectId, required: true, index: true },
    answer_payload: { type: Schema.Types.Mixed, required: true },
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private',
      required: true
    },
    origin: { type: String, enum: ['onboarding', 'manual', 'riddle'], required: true },
    riddle_id: { type: Schema.Types.ObjectId },
    community_id: { type: Schema.Types.ObjectId }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

profileAnswerSchema.index({ user_id: 1, created_at: -1 });
profileAnswerSchema.index({ question_id: 1, user_id: 1 });
profileAnswerSchema.index({ visibility: 1, community_id: 1 });

const compatibilitySnapshotSchema = new Schema<ICompatibilitySnapshot>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    other_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: Schema.Types.ObjectId },
    score: { type: Number, required: true },
    explanation_keys: { type: [String], required: true },
    computed_at: { type: Date, required: true },
    expires_at: { type: Date, required: true }
  },
  { timestamps: false }
);

compatibilitySnapshotSchema.index({ user_id: 1, other_user_id: 1, community_id: 1 }, { unique: true });
compatibilitySnapshotSchema.index({ user_id: 1, community_id: 1, score: -1 });

export const Profile: Model<IProfile> =
  (mongoose.models.Profile as Model<IProfile>) || mongoose.model<IProfile>('Profile', profileSchema);

export const Friendship: Model<IFriendship> =
  (mongoose.models.Friendship as Model<IFriendship>) ||
  mongoose.model<IFriendship>('Friendship', friendshipSchema);

export const Question: Model<IQuestion> =
  (mongoose.models.Question as Model<IQuestion>) || mongoose.model<IQuestion>('Question', questionSchema);

export const ProfileAnswer: Model<IProfileAnswer> =
  (mongoose.models.ProfileAnswer as Model<IProfileAnswer>) ||
  mongoose.model<IProfileAnswer>('ProfileAnswer', profileAnswerSchema);

export const CompatibilitySnapshot: Model<ICompatibilitySnapshot> =
  (mongoose.models.CompatibilitySnapshot as Model<ICompatibilitySnapshot>) ||
  mongoose.model<ICompatibilitySnapshot>('CompatibilitySnapshot', compatibilitySnapshotSchema);
