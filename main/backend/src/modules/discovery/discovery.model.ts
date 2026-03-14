import mongoose, { Model, Schema } from 'mongoose';

type GeoPoint = { type: 'Point'; coordinates: [number, number] };

interface ICommunityFeedItem {
  community_id: mongoose.Types.ObjectId;
  item_type: 'post' | 'event' | 'ping';
  item_id: mongoose.Types.ObjectId;
  published_at: Date;
  visibility_flags?: Record<string, unknown>;
}

interface IOpenEventProjection {
  event_id: mongoose.Types.ObjectId;
  topic?: string;
  location_point: GeoPoint;
  start_at: Date;
  is_public: boolean;
}

interface IServicesDiscoveryProjection {
  service_id: mongoose.Types.ObjectId;
  community_id: mongoose.Types.ObjectId;
  category: string;
  status: string;
  created_at: Date;
}

const communityFeedItemSchema = new Schema<ICommunityFeedItem>(
  {
    community_id: { type: Schema.Types.ObjectId, required: true, index: true },
    item_type: { type: String, enum: ['post', 'event', 'ping'], required: true },
    item_id: { type: Schema.Types.ObjectId, required: true },
    published_at: { type: Date, required: true },
    visibility_flags: { type: Schema.Types.Mixed }
  },
  { timestamps: false }
);

communityFeedItemSchema.index({ community_id: 1, published_at: -1 });

const openEventProjectionSchema = new Schema<IOpenEventProjection>(
  {
    event_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
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
    start_at: { type: Date, required: true, index: true },
    is_public: { type: Boolean, required: true, index: true }
  },
  { timestamps: false }
);

openEventProjectionSchema.index({ is_public: 1, start_at: 1 });
openEventProjectionSchema.index({ location_point: '2dsphere' });

const servicesDiscoveryProjectionSchema = new Schema<IServicesDiscoveryProjection>(
  {
    service_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    community_id: { type: Schema.Types.ObjectId, required: true },
    category: { type: String, required: true },
    status: { type: String, required: true },
    created_at: { type: Date, required: true }
  },
  { timestamps: false }
);

servicesDiscoveryProjectionSchema.index({ status: 1, created_at: -1 });

export const CommunityFeedItem: Model<ICommunityFeedItem> =
  (mongoose.models.CommunityFeedItem as Model<ICommunityFeedItem>) ||
  mongoose.model<ICommunityFeedItem>('CommunityFeedItem', communityFeedItemSchema);

export const OpenEventProjection: Model<IOpenEventProjection> =
  (mongoose.models.OpenEventProjection as Model<IOpenEventProjection>) ||
  mongoose.model<IOpenEventProjection>('OpenEventProjection', openEventProjectionSchema);

export const ServicesDiscoveryProjection: Model<IServicesDiscoveryProjection> =
  (mongoose.models.ServicesDiscoveryProjection as Model<IServicesDiscoveryProjection>) ||
  mongoose.model<IServicesDiscoveryProjection>(
    'ServicesDiscoveryProjection',
    servicesDiscoveryProjectionSchema
  );
