import mongoose, { Model, Schema } from 'mongoose';

import {
  CommunityAccessModes,
  CommunityRoles,
  CommunityStates,
  DecisionStatuses,
  MembershipStatuses,
  PublishModes,
  ReplyModes
} from '../../shared/constants/enums';

type GeoPoint = { type: 'Point'; coordinates: [number, number] };

type GeoPolygon = { type: 'Polygon'; coordinates: number[][][] };

interface ICommunity {
  name: string;
  slug: string;
  description?: string;
  created_by_user_id: string;
  neighborhood_name?: string;
  group_kind: 'standard' | 'custom';
  group_key?: string;
  visibility: 'public' | 'private';
  state: (typeof CommunityStates)[number];
  members_count: number;
  created_at: Date;
  updated_at: Date;
}

interface ICommunitySettings {
  community_id: mongoose.Types.ObjectId;
  waiting_room_enabled: boolean;
  access_mode: (typeof CommunityAccessModes)[number];
  publish_mode: (typeof PublishModes)[number];
  reply_mode: (typeof ReplyModes)[number];
  allow_anonymous_participation: boolean;
  posts_enabled: boolean;
  events_enabled: boolean;
  polls_enabled: boolean;
  pings_enabled: boolean;
  services_enabled: boolean;
  daily_riddle_enabled: boolean;
  ping_monthly_limit_per_user?: number;
  updated_by_user_id: string;
  updated_at: Date;
}

interface ICommunityMembership {
  community_id: mongoose.Types.ObjectId;
  user_id: string;
  role: (typeof CommunityRoles)[number];
  status: (typeof MembershipStatuses)[number];
  anonymous_alias?: string;
  invited_by_user_id?: string;
  approved_by_user_id?: string;
  joined_at?: Date;
  left_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface ICommunityInvite {
  community_id: mongoose.Types.ObjectId;
  inviter_user_id: string;
  invitee_user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  expires_at: Date;
  responded_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface IJoinRequest {
  community_id: mongoose.Types.ObjectId;
  requester_user_id: string;
  message?: string;
  status: (typeof DecisionStatuses)[number];
  decided_by_user_id?: string;
  decided_at?: Date;
  decision_reason?: string;
  created_at: Date;
  updated_at: Date;
}

interface IPublishRequest {
  community_id: mongoose.Types.ObjectId;
  requester_user_id: string;
  content_type: 'post' | 'event' | 'ping' | 'service';
  payload_snapshot: Record<string, unknown>;
  status: (typeof DecisionStatuses)[number];
  created_content_type?: 'post' | 'event' | 'ping' | 'service';
  created_content_id?: mongoose.Types.ObjectId;
  decided_by_user_id?: string;
  decided_at?: Date;
  decision_reason?: string;
  created_at: Date;
  updated_at: Date;
}

interface ICommunityAccessPolicy {
  community_id: mongoose.Types.ObjectId;
  requires_verification: boolean;
  location_match_scope: 'home' | 'work' | 'home_or_work';
  eligibility_mode: 'none' | 'city' | 'radius' | 'polygon';
  city_codes?: string[];
  center_point?: GeoPoint;
  radius_km?: number;
  polygon?: GeoPolygon;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ICommunityRecognition {
  community_id: mongoose.Types.ObjectId;
  user_id: string;
  source_type: 'golden_comment' | 'event_attendance' | 'admin_award';
  source_id: mongoose.Types.ObjectId;
  points_delta: number;
  note?: string;
  awarded_by_user_id: string;
  awarded_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface ICommunityMessage {
  community_id: mongoose.Types.ObjectId;
  user_id: string;
  user_name: string;
  user_photo_base64?: string;
  message_type: 'text' | 'event';
  text?: string;
  image_base64?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by_user_id?: string;
  approved_at?: Date;
  event_thread_id?: string;
  event_title?: string;
  event_description?: string;
  event_starts_at?: Date;
  event_ends_at?: Date;
  event_location_label?: string;
  event_location_point?: GeoPoint;
  attendees?: Array<{
    user_id: string;
    user_name: string;
    user_photo_base64?: string;
    responded_at: Date;
  }>;
  created_at: Date;
  updated_at: Date;
}

const optionalPointSchema = new Schema<GeoPoint>(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value: number[]) {
          return value.length === 2;
        },
        message: 'Coordinates must be [lng, lat]'
      }
    }
  },
  { _id: false }
);

const communitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    created_by_user_id: { type: String, required: true, index: true },
    neighborhood_name: { type: String, index: true },
    group_kind: { type: String, enum: ['standard', 'custom'], default: 'standard', required: true },
    group_key: { type: String, index: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'public', required: true },
    state: { type: String, enum: CommunityStates, default: 'active', required: true },
    members_count: { type: Number, default: 0, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communitySchema.index({ visibility: 1, state: 1 });
communitySchema.index({ neighborhood_name: 1, group_kind: 1 });
communitySchema.index(
  { neighborhood_name: 1, group_key: 1 },
  {
    name: 'community_standard_group_key_unique',
    unique: true,
    partialFilterExpression: {
      group_kind: 'standard',
      neighborhood_name: { $exists: true, $type: 'string' },
      group_key: { $exists: true, $type: 'string' }
    }
  }
);

const communitySettingsSchema = new Schema<ICommunitySettings>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    waiting_room_enabled: { type: Boolean, default: false, required: true },
    access_mode: { type: String, enum: CommunityAccessModes, default: 'open', required: true },
    publish_mode: { type: String, enum: PublishModes, default: 'direct', required: true },
    reply_mode: { type: String, enum: ReplyModes, default: 'fully_allowed', required: true },
    allow_anonymous_participation: { type: Boolean, default: false, required: true },
    posts_enabled: { type: Boolean, default: true, required: true },
    events_enabled: { type: Boolean, default: true, required: true },
    polls_enabled: { type: Boolean, default: true, required: true },
    pings_enabled: { type: Boolean, default: false, required: true },
    services_enabled: { type: Boolean, default: true, required: true },
    daily_riddle_enabled: { type: Boolean, default: false, required: true },
    ping_monthly_limit_per_user: { type: Number },
    updated_by_user_id: { type: String, required: true }
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

const communityMembershipSchema = new Schema<ICommunityMembership>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    role: { type: String, enum: CommunityRoles, default: 'member', required: true },
    status: { type: String, enum: MembershipStatuses, default: 'pending', required: true },
    anonymous_alias: { type: String },
    invited_by_user_id: { type: String },
    approved_by_user_id: { type: String },
    joined_at: { type: Date },
    left_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communityMembershipSchema.index({ community_id: 1, user_id: 1 }, { unique: true });
communityMembershipSchema.index({ community_id: 1, role: 1, status: 1 });
communityMembershipSchema.index({ user_id: 1, status: 1 });

const communityInviteSchema = new Schema<ICommunityInvite>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    inviter_user_id: { type: String, required: true },
    invitee_user_id: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'],
      default: 'pending',
      required: true
    },
    expires_at: { type: Date, required: true },
    responded_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communityInviteSchema.index({ invitee_user_id: 1, status: 1, created_at: -1 });
communityInviteSchema.index({ community_id: 1, status: 1 });

const joinRequestSchema = new Schema<IJoinRequest>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    requester_user_id: { type: String, required: true, index: true },
    message: { type: String },
    status: { type: String, enum: DecisionStatuses, default: 'submitted', required: true },
    decided_by_user_id: { type: String },
    decided_at: { type: Date },
    decision_reason: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

joinRequestSchema.index({ community_id: 1, status: 1, created_at: 1 });
joinRequestSchema.index({ requester_user_id: 1, status: 1 });

const publishRequestSchema = new Schema<IPublishRequest>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    requester_user_id: { type: String, required: true, index: true },
    content_type: { type: String, enum: ['post', 'event', 'ping', 'service'], required: true },
    payload_snapshot: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: DecisionStatuses, default: 'submitted', required: true },
    created_content_type: { type: String, enum: ['post', 'event', 'ping', 'service'] },
    created_content_id: { type: Schema.Types.ObjectId },
    decided_by_user_id: { type: String },
    decided_at: { type: Date },
    decision_reason: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

publishRequestSchema.index({ community_id: 1, status: 1, created_at: 1 });
publishRequestSchema.index({ requester_user_id: 1, status: 1, created_at: -1 });

const communityAccessPolicySchema = new Schema<ICommunityAccessPolicy>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    requires_verification: { type: Boolean, default: true, required: true },
    location_match_scope: {
      type: String,
      enum: ['home', 'work', 'home_or_work'],
      default: 'home_or_work',
      required: true
    },
    eligibility_mode: {
      type: String,
      enum: ['none', 'city', 'radius', 'polygon'],
      default: 'none',
      required: true
    },
    city_codes: { type: [String], default: undefined },
    center_point: { type: optionalPointSchema, required: false },
    radius_km: { type: Number },
    polygon: { type: Schema.Types.Mixed },
    is_active: { type: Boolean, default: true, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communityAccessPolicySchema.index({ center_point: '2dsphere' });
communityAccessPolicySchema.index({ polygon: '2dsphere' });

const communityRecognitionSchema = new Schema<ICommunityRecognition>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    source_type: {
      type: String,
      enum: ['golden_comment', 'event_attendance', 'admin_award'],
      required: true
    },
    source_id: { type: Schema.Types.ObjectId, required: true },
    points_delta: { type: Number, required: true },
    note: { type: String },
    awarded_by_user_id: { type: String, required: true },
    awarded_at: { type: Date, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communityRecognitionSchema.index({ community_id: 1, user_id: 1, awarded_at: -1 });

const communityMessageSchema = new Schema<ICommunityMessage>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    user_name: { type: String, required: true },
    user_photo_base64: { type: String },
    message_type: { type: String, enum: ['text', 'event'], default: 'text', required: true },
    text: { type: String },
    image_base64: { type: String },
    approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    approved_by_user_id: { type: String },
    approved_at: { type: Date },
    event_thread_id: { type: String, index: true },
    event_title: { type: String },
    event_description: { type: String },
    event_starts_at: { type: Date },
    event_ends_at: { type: Date },
    event_location_label: { type: String },
    event_location_point: { type: optionalPointSchema, required: false },
    attendees: {
      type: [
        new Schema(
          {
            user_id: { type: String, required: true },
            user_name: { type: String, required: true },
            user_photo_base64: { type: String },
            responded_at: { type: Date, required: true }
          },
          { _id: false }
        )
      ],
      default: undefined
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

communityMessageSchema.index({ community_id: 1, created_at: -1 });
communityMessageSchema.index({ community_id: 1, message_type: 1, approval_status: 1, created_at: -1 });

export const Community: Model<ICommunity> =
  (mongoose.models.Community as Model<ICommunity>) || mongoose.model<ICommunity>('Community', communitySchema);

export const CommunitySettings: Model<ICommunitySettings> =
  (mongoose.models.CommunitySettings as Model<ICommunitySettings>) ||
  mongoose.model<ICommunitySettings>('CommunitySettings', communitySettingsSchema);

export const CommunityMembership: Model<ICommunityMembership> =
  (mongoose.models.CommunityMembership as Model<ICommunityMembership>) ||
  mongoose.model<ICommunityMembership>('CommunityMembership', communityMembershipSchema);

export const CommunityInvite: Model<ICommunityInvite> =
  (mongoose.models.CommunityInvite as Model<ICommunityInvite>) ||
  mongoose.model<ICommunityInvite>('CommunityInvite', communityInviteSchema);

export const JoinRequest: Model<IJoinRequest> =
  (mongoose.models.JoinRequest as Model<IJoinRequest>) ||
  mongoose.model<IJoinRequest>('JoinRequest', joinRequestSchema);

export const PublishRequest: Model<IPublishRequest> =
  (mongoose.models.PublishRequest as Model<IPublishRequest>) ||
  mongoose.model<IPublishRequest>('PublishRequest', publishRequestSchema);

export const CommunityAccessPolicy: Model<ICommunityAccessPolicy> =
  (mongoose.models.CommunityAccessPolicy as Model<ICommunityAccessPolicy>) ||
  mongoose.model<ICommunityAccessPolicy>('CommunityAccessPolicy', communityAccessPolicySchema);

export const CommunityRecognition: Model<ICommunityRecognition> =
  (mongoose.models.CommunityRecognition as Model<ICommunityRecognition>) ||
  mongoose.model<ICommunityRecognition>('CommunityRecognition', communityRecognitionSchema);

export const CommunityMessage: Model<ICommunityMessage> =
  (mongoose.models.CommunityMessage as Model<ICommunityMessage>) ||
  mongoose.model<ICommunityMessage>('CommunityMessage', communityMessageSchema);
