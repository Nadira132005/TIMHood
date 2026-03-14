import mongoose, { Model, Schema } from 'mongoose';

import { PingStates } from '../../shared/constants/enums';

type GeoPoint = { type: 'Point'; coordinates: [number, number] };

interface IPing {
  community_id: mongoose.Types.ObjectId;
  creator_user_id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  location_point: GeoPoint;
  location_label?: string;
  status: (typeof PingStates)[number];
  responses_count: number;
  expires_at: Date;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface IPingResponse {
  ping_id: mongoose.Types.ObjectId;
  community_id: mongoose.Types.ObjectId;
  responder_user_id: mongoose.Types.ObjectId;
  status: 'will_help' | 'withdrawn';
  responded_at: Date;
  updated_at: Date;
}

interface IPingQuotaUsage {
  community_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  year_month: string;
  created_count: number;
  updated_at: Date;
}

const pingSchema = new Schema<IPing>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    creator_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
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
    location_label: { type: String },
    status: { type: String, enum: PingStates, default: 'active', required: true },
    responses_count: { type: Number, default: 0, required: true },
    expires_at: { type: Date, required: true },
    resolved_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

pingSchema.index({ community_id: 1, status: 1, created_at: -1 });
pingSchema.index({ creator_user_id: 1, created_at: -1 });
pingSchema.index({ location_point: '2dsphere' });
pingSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const pingResponseSchema = new Schema<IPingResponse>(
  {
    ping_id: { type: Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: Schema.Types.ObjectId, required: true },
    responder_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, enum: ['will_help', 'withdrawn'], default: 'will_help', required: true },
    responded_at: { type: Date, required: true }
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

pingResponseSchema.index({ ping_id: 1, responder_user_id: 1 }, { unique: true });
pingResponseSchema.index({ ping_id: 1, status: 1, responded_at: 1 });

const pingQuotaUsageSchema = new Schema<IPingQuotaUsage>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    year_month: { type: String, required: true },
    created_count: { type: Number, default: 0, required: true }
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

pingQuotaUsageSchema.index({ community_id: 1, user_id: 1, year_month: 1 }, { unique: true });

export const Ping: Model<IPing> =
  (mongoose.models.Ping as Model<IPing>) || mongoose.model<IPing>('Ping', pingSchema);

export const PingResponse: Model<IPingResponse> =
  (mongoose.models.PingResponse as Model<IPingResponse>) ||
  mongoose.model<IPingResponse>('PingResponse', pingResponseSchema);

export const PingQuotaUsage: Model<IPingQuotaUsage> =
  (mongoose.models.PingQuotaUsage as Model<IPingQuotaUsage>) ||
  mongoose.model<IPingQuotaUsage>('PingQuotaUsage', pingQuotaUsageSchema);
