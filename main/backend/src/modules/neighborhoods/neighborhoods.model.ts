import mongoose, { Model, Schema } from 'mongoose';

interface INeighborhood {
  _id: string;
  name: string;
  slug: string;
  description: string;
  source: string;
  map_top: number;
  map_left: number;
  map_width: number;
  map_height: number;
  created_at: Date;
  updated_at: Date;
}

interface INeighborhoodMessage {
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

const neighborhoodSchema = new Schema<INeighborhood>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    source: { type: String, required: true, default: 'https://harta.primariatm.ro/' },
    map_top: { type: Number, required: true },
    map_left: { type: Number, required: true },
    map_width: { type: Number, required: true },
    map_height: { type: Number, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const neighborhoodMessageSchema = new Schema<INeighborhoodMessage>(
  {
    neighborhood_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    user_name: { type: String, required: true },
    user_document_number: { type: String, required: true },
    user_photo_base64: { type: String },
    text: { type: String },
    image_base64: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

neighborhoodMessageSchema.index({ neighborhood_id: 1, created_at: -1 });

export const Neighborhood: Model<INeighborhood> =
  (mongoose.models.Neighborhood as Model<INeighborhood>) ||
  mongoose.model<INeighborhood>('Neighborhood', neighborhoodSchema);

export const NeighborhoodMessage: Model<INeighborhoodMessage> =
  (mongoose.models.NeighborhoodMessage as Model<INeighborhoodMessage>) ||
  mongoose.model<INeighborhoodMessage>('NeighborhoodMessage', neighborhoodMessageSchema);
