import mongoose, { Model, Schema } from "mongoose";

type Point = {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
};

type Polygon = {
  type: "Polygon";
  coordinates: [number, number][][]; // GeoJSON polygon rings
};

type MultiPolygon = {
  type: "MultiPolygon";
  coordinates: [number, number][][][];
};

export interface INeighborhood {
  _id: string;
  source_id?: number; // db_id / geometryId from source dataset
  name: string;
  slug: string;
  description: string;
  geometry: Polygon | MultiPolygon;
  center?: Point;
  map_top?: number;
  map_left?: number;
  map_width?: number;
  map_height?: number;
  created_at: Date;
  updated_at: Date;
}

export interface INeighborhoodMessage {
  neighborhood_id: string;
  user_id: string;
  user_name: string;
  user_document_number: string;
  user_photo_base64?: string;
  text?: string;
  image_base64?: string;
  created_at: Date;
  updated_at: Date;
}

const pointSchema = new Schema<Point>(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]) => value.length === 2,
      },
    },
  },
  { _id: false },
);

const polygonSchema = new Schema(
  {
    type: { type: String, enum: ["Polygon", "MultiPolygon"], required: true },
    coordinates: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const neighborhoodSchema = new Schema<INeighborhood>(
  {
    _id: { type: String, required: true },
    source_id: { type: Number, index: true },
    name: { type: String, required: true, unique: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    description: { type: String, required: true, trim: true },
    geometry: { type: polygonSchema, required: true },
    center: { type: pointSchema, required: false },

    // keep only if still used by the UI
    map_top: { type: Number },
    map_left: { type: Number },
    map_width: { type: Number },
    map_height: { type: Number },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

neighborhoodSchema.index({ geometry: "2dsphere" });

const neighborhoodMessageSchema = new Schema<INeighborhoodMessage>(
  {
    neighborhood_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    user_name: { type: String, required: true, trim: true },
    user_document_number: { type: String, required: true, trim: true },
    user_photo_base64: { type: String },
    text: { type: String, trim: true },
    image_base64: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

neighborhoodMessageSchema.index({ neighborhood_id: 1, created_at: -1 });

neighborhoodMessageSchema.pre("validate", function (next) {
  if (!this.text && !this.image_base64) {
    return next(new Error("Message text or image is required"));
  }
  next();
});

export const Neighborhood: Model<INeighborhood> =
  (mongoose.models.Neighborhood as Model<INeighborhood>) ||
  mongoose.model<INeighborhood>("Neighborhood", neighborhoodSchema);

export const NeighborhoodMessage: Model<INeighborhoodMessage> =
  (mongoose.models.NeighborhoodMessage as Model<INeighborhoodMessage>) ||
  mongoose.model<INeighborhoodMessage>(
    "NeighborhoodMessage",
    neighborhoodMessageSchema,
  );
