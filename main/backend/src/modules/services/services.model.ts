import mongoose, { Model, Schema } from 'mongoose';

import { ServiceApplicationStates, ServiceStates } from '../../shared/constants/enums';

type GeoPoint = { type: 'Point'; coordinates: [number, number] };

interface IService {
  community_id: mongoose.Types.ObjectId;
  creator_user_id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  preferred_mode: 'online' | 'in_person' | 'flexible';
  preferred_location_label?: string;
  preferred_location_point?: GeoPoint;
  preferred_time_start?: Date;
  preferred_time_end?: Date;
  status: (typeof ServiceStates)[number];
  accepts_new_applications: boolean;
  applications_count: number;
  selected_application_id?: mongoose.Types.ObjectId;
  selected_helper_user_id?: mongoose.Types.ObjectId;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface IServiceApplication {
  service_id: mongoose.Types.ObjectId;
  community_id: mongoose.Types.ObjectId;
  applicant_user_id: mongoose.Types.ObjectId;
  message?: string;
  status: (typeof ServiceApplicationStates)[number];
  decided_by_user_id?: mongoose.Types.ObjectId;
  decided_at?: Date;
  decision_reason?: string;
  created_at: Date;
  updated_at: Date;
}

interface IServiceReview {
  service_id: mongoose.Types.ObjectId;
  reviewer_user_id: mongoose.Types.ObjectId;
  reviewee_user_id: mongoose.Types.ObjectId;
  reviewer_role: 'creator' | 'helper';
  score: number;
  comment?: string;
  created_at: Date;
  updated_at: Date;
}

const serviceSchema = new Schema<IService>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    creator_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    preferred_mode: {
      type: String,
      enum: ['online', 'in_person', 'flexible'],
      required: true
    },
    preferred_location_label: { type: String },
    preferred_location_point: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        validate: {
          validator(value: number[]) {
            return !value || value.length === 2;
          },
          message: 'Coordinates must be [lng, lat]'
        }
      }
    },
    preferred_time_start: { type: Date },
    preferred_time_end: { type: Date },
    status: {
      type: String,
      enum: ServiceStates,
      default: 'open',
      required: true
    },
    accepts_new_applications: { type: Boolean, default: true, required: true },
    applications_count: { type: Number, default: 0, required: true },
    selected_application_id: { type: Schema.Types.ObjectId },
    selected_helper_user_id: { type: Schema.Types.ObjectId },
    completed_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

serviceSchema.index({ community_id: 1, status: 1, created_at: -1 });
serviceSchema.index({ status: 1, created_at: -1 });
serviceSchema.index({ preferred_location_point: '2dsphere' }, { sparse: true });

const serviceApplicationSchema = new Schema<IServiceApplication>(
  {
    service_id: { type: Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    applicant_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    message: { type: String },
    status: {
      type: String,
      enum: ServiceApplicationStates,
      default: 'submitted',
      required: true
    },
    decided_by_user_id: { type: Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

serviceApplicationSchema.index({ service_id: 1, applicant_user_id: 1 }, { unique: true });
serviceApplicationSchema.index({ service_id: 1, status: 1, created_at: 1 });
serviceApplicationSchema.index({ applicant_user_id: 1, status: 1, created_at: -1 });

const serviceReviewSchema = new Schema<IServiceReview>(
  {
    service_id: { type: Schema.Types.ObjectId, required: true, index: true },
    reviewer_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    reviewee_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    reviewer_role: { type: String, enum: ['creator', 'helper'], required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

serviceReviewSchema.index({ service_id: 1, reviewer_user_id: 1 }, { unique: true });
serviceReviewSchema.index({ reviewee_user_id: 1, created_at: -1 });

export const Service: Model<IService> =
  (mongoose.models.Service as Model<IService>) || mongoose.model<IService>('Service', serviceSchema);

export const ServiceApplication: Model<IServiceApplication> =
  (mongoose.models.ServiceApplication as Model<IServiceApplication>) ||
  mongoose.model<IServiceApplication>('ServiceApplication', serviceApplicationSchema);

export const ServiceReview: Model<IServiceReview> =
  (mongoose.models.ServiceReview as Model<IServiceReview>) ||
  mongoose.model<IServiceReview>('ServiceReview', serviceReviewSchema);
