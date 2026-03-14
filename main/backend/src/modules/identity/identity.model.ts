import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

import { VerificationStates } from '../../shared/constants/enums';

type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export interface IUser {
  email: string;
  phone?: string;
  password_hash: string;
  account_status: 'active' | 'disabled';
  document_number_encrypted?: string;
  document_number_hash?: string;
  verification_state: (typeof VerificationStates)[number];
  verified_at?: Date;
  verification_locked_at?: Date;
  last_seen_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IUserLocation {
  user_id: mongoose.Types.ObjectId;
  home_location_point: GeoPoint;
  home_location_label?: string;
  home_place_id?: string;
  home_input_source: 'pin_drop' | 'maps_place_input';
  work_location_point?: GeoPoint;
  work_location_label?: string;
  work_place_id?: string;
  work_input_source?: 'pin_drop' | 'maps_place_input';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    password_hash: { type: String, required: true },
    account_status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    document_number_encrypted: { type: String },
    document_number_hash: { type: String, unique: true, sparse: true },
    verification_state: {
      type: String,
      enum: VerificationStates,
      default: 'unverified',
      required: true
    },
    verified_at: { type: Date },
    verification_locked_at: { type: Date },
    last_seen_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const pointSchema: Record<string, unknown> = {
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
};

const optionalPointSchema: Record<string, unknown> = {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    validate: {
      validator(value: number[]) {
        return value === undefined || (Array.isArray(value) && value.length === 2);
      },
      message: 'Coordinates must be [lng, lat]'
    }
  }
};

const userLocationSchema = new Schema<IUserLocation>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    home_location_point: { type: pointSchema as any, required: true },
    home_location_label: { type: String },
    home_place_id: { type: String },
    home_input_source: {
      type: String,
      enum: ['pin_drop', 'maps_place_input'],
      required: true
    },
    work_location_point: { type: optionalPointSchema as any, required: false },
    work_location_label: { type: String },
    work_place_id: { type: String },
    work_input_source: { type: String, enum: ['pin_drop', 'maps_place_input'] },
    is_active: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userLocationSchema.index({ home_location_point: '2dsphere' });
userLocationSchema.index({ work_location_point: '2dsphere' }, { sparse: true });

export type UserDocument = HydratedDocument<IUser>;
export type UserLocationDocument = HydratedDocument<IUserLocation>;

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema);

export const UserLocation: Model<IUserLocation> =
  (mongoose.models.UserLocation as Model<IUserLocation>) ||
  mongoose.model<IUserLocation>('UserLocation', userLocationSchema);
