import mongoose, { HydratedDocument, Model, Schema } from "mongoose";

import { VerificationStates } from "../../shared/constants/enums";

type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

export interface IUser {
  _id: string;
  account_status: "active" | "disabled";
  document_number?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  nationality?: string;
  issuing_state?: string;
  date_of_birth?: Date;
  date_of_expiry?: Date;
  profile_photo_base64?: string;
  bio?: string;
  show_photo_to_others: boolean;
  show_age_to_others: boolean;
  home_address_label?: string;
  home_neighborhood?: string;
  last_seen_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IUserLocation {
  user_id: string;
  home_location_point: GeoPoint;
  work_location_point?: GeoPoint;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true, trim: true },
    account_status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
    document_number: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    full_name: { type: String },
    nationality: { type: String },
    issuing_state: { type: String },
    date_of_birth: { type: Date },
    date_of_expiry: { type: Date },
    profile_photo_base64: { type: String },
    bio: { type: String },
    show_photo_to_others: { type: Boolean, default: true, required: true },
    show_age_to_others: { type: Boolean, default: true, required: true },
    home_address_label: { type: String },
    home_neighborhood: { type: String },
    last_seen_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

const pointSchema = new Schema<GeoPoint>(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value: number[]) {
          return Array.isArray(value) && value.length === 2;
        },
        message: "Coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false },
);

const optionalPointSchema = new Schema<GeoPoint>(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      validate: {
        validator(value: number[]) {
          return (
            value === undefined || (Array.isArray(value) && value.length === 2)
          );
        },
        message: "Coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false },
);

const userLocationSchema = new Schema<IUserLocation>(
  {
    user_id: {
      type: String,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    home_location_point: { type: pointSchema, required: true },
    work_location_point: { type: optionalPointSchema, required: false },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

userLocationSchema.index({ home_location_point: "2dsphere" });
userLocationSchema.index({ work_location_point: "2dsphere" }, { sparse: true });

export type UserDocument = HydratedDocument<IUser>;
export type UserLocationDocument = HydratedDocument<IUserLocation>;

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export const UserLocation: Model<IUserLocation> =
  (mongoose.models.UserLocation as Model<IUserLocation>) ||
  mongoose.model<IUserLocation>("UserLocation", userLocationSchema);
