import mongoose, { Model, Schema } from 'mongoose';

import { EventRequestStates, EventShareStates, EventStates } from '../../shared/constants/enums';

type GeoPoint = { type: 'Point'; coordinates: [number, number] };

interface IEvent {
  origin_community_id: mongoose.Types.ObjectId;
  creator_user_id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  topic?: string;
  location_point: GeoPoint;
  location_label: string;
  start_at: Date;
  end_at: Date;
  is_public: boolean;
  status: (typeof EventStates)[number];
  roles_enabled: boolean;
  participants_count: number;
  requests_count: number;
  visible_in_community_ids: mongoose.Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

interface IEventRole {
  event_id: mongoose.Types.ObjectId;
  name: string;
  capacity?: number;
  accepted_count: number;
  status: 'active' | 'closed';
  created_at: Date;
  updated_at: Date;
}

interface IEventShare {
  event_id: mongoose.Types.ObjectId;
  origin_community_id: mongoose.Types.ObjectId;
  target_community_id: mongoose.Types.ObjectId;
  requested_by_user_id: mongoose.Types.ObjectId;
  status: (typeof EventShareStates)[number];
  decided_by_user_id?: mongoose.Types.ObjectId;
  decided_at?: Date;
  decision_reason?: string;
  created_at: Date;
  updated_at: Date;
}

interface IEventParticipationRequest {
  event_id: mongoose.Types.ObjectId;
  requester_user_id: mongoose.Types.ObjectId;
  requested_role_id?: mongoose.Types.ObjectId;
  message?: string;
  status: (typeof EventRequestStates)[number];
  decided_by_user_id?: mongoose.Types.ObjectId;
  decided_at?: Date;
  decision_reason?: string;
  created_at: Date;
  updated_at: Date;
}

interface IEventParticipant {
  event_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role_id?: mongoose.Types.ObjectId;
  source_request_id: mongoose.Types.ObjectId;
  status: 'accepted' | 'checked_in' | 'cancelled';
  accepted_by_user_id: mongoose.Types.ObjectId;
  accepted_at: Date;
  created_at: Date;
  updated_at: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    origin_community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    creator_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    topic: { type: String },
    location_point: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value: number[]) {
            return Array.isArray(value) && value.length === 2;
          },
          message: 'Coordinates must be [lng, lat]'
        }
      }
    },
    location_label: { type: String, required: true },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    is_public: { type: Boolean, default: false, required: true },
    status: { type: String, enum: EventStates, default: 'draft', required: true },
    roles_enabled: { type: Boolean, default: false, required: true },
    participants_count: { type: Number, default: 0, required: true },
    requests_count: { type: Number, default: 0, required: true },
    visible_in_community_ids: {
      type: [Schema.Types.ObjectId],
      default: [],
      required: true
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

eventSchema.index({ origin_community_id: 1, status: 1, start_at: 1 });
eventSchema.index({ is_public: 1, status: 1, start_at: 1 });
eventSchema.index({ visible_in_community_ids: 1, status: 1, start_at: 1 });
eventSchema.index({ location_point: '2dsphere' });

const eventRoleSchema = new Schema<IEventRole>(
  {
    event_id: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    capacity: { type: Number },
    accepted_count: { type: Number, default: 0, required: true },
    status: { type: String, enum: ['active', 'closed'], default: 'active', required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

eventRoleSchema.index({ event_id: 1, name: 1 }, { unique: true });
eventRoleSchema.index({ event_id: 1, status: 1 });

const eventShareSchema = new Schema<IEventShare>(
  {
    event_id: { type: Schema.Types.ObjectId, required: true, index: true },
    origin_community_id: { type: Schema.Types.ObjectId, required: true },
    target_community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    requested_by_user_id: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: EventShareStates, default: 'requested', required: true },
    decided_by_user_id: { type: Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

eventShareSchema.index({ event_id: 1, target_community_id: 1 }, { unique: true });
eventShareSchema.index({ target_community_id: 1, status: 1, created_at: 1 });

const eventParticipationRequestSchema = new Schema<IEventParticipationRequest>(
  {
    event_id: { type: Schema.Types.ObjectId, required: true, index: true },
    requester_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    requested_role_id: { type: Schema.Types.ObjectId },
    message: { type: String },
    status: { type: String, enum: EventRequestStates, default: 'requested', required: true },
    decided_by_user_id: { type: Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

eventParticipationRequestSchema.index({ event_id: 1, status: 1, created_at: 1 });
eventParticipationRequestSchema.index({ requester_user_id: 1, status: 1, created_at: -1 });
eventParticipationRequestSchema.index(
  { event_id: 1, requester_user_id: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['requested'] }
    }
  }
);

const eventParticipantSchema = new Schema<IEventParticipant>(
  {
    event_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    role_id: { type: Schema.Types.ObjectId },
    source_request_id: { type: Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ['accepted', 'checked_in', 'cancelled'],
      default: 'accepted',
      required: true
    },
    accepted_by_user_id: { type: Schema.Types.ObjectId, required: true },
    accepted_at: { type: Date, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

eventParticipantSchema.index({ event_id: 1, user_id: 1 }, { unique: true });
eventParticipantSchema.index({ event_id: 1, status: 1 });
eventParticipantSchema.index({ user_id: 1, status: 1, accepted_at: -1 });

export const Event: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent>) || mongoose.model<IEvent>('Event', eventSchema);

export const EventRole: Model<IEventRole> =
  (mongoose.models.EventRole as Model<IEventRole>) ||
  mongoose.model<IEventRole>('EventRole', eventRoleSchema);

export const EventShare: Model<IEventShare> =
  (mongoose.models.EventShare as Model<IEventShare>) ||
  mongoose.model<IEventShare>('EventShare', eventShareSchema);

export const EventParticipationRequest: Model<IEventParticipationRequest> =
  (mongoose.models.EventParticipationRequest as Model<IEventParticipationRequest>) ||
  mongoose.model<IEventParticipationRequest>('EventParticipationRequest', eventParticipationRequestSchema);

export const EventParticipant: Model<IEventParticipant> =
  (mongoose.models.EventParticipant as Model<IEventParticipant>) ||
  mongoose.model<IEventParticipant>('EventParticipant', eventParticipantSchema);
