import mongoose, { Model, Schema } from 'mongoose';

interface IFriendRequest {
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

interface IDirectMessage {
  from_user_id: string;
  to_user_id: string;
  text?: string;
  image_base64?: string;
  created_at: Date;
  updated_at: Date;
}

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    from_user_id: { type: String, required: true, index: true },
    to_user_id: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

friendRequestSchema.index({ from_user_id: 1, to_user_id: 1 }, { unique: true });

const directMessageSchema = new Schema<IDirectMessage>(
  {
    from_user_id: { type: String, required: true, index: true },
    to_user_id: { type: String, required: true, index: true },
    text: { type: String },
    image_base64: { type: String }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

directMessageSchema.index({ from_user_id: 1, to_user_id: 1, created_at: -1 });

export const FriendRequest: Model<IFriendRequest> =
  (mongoose.models.FriendRequest as Model<IFriendRequest>) ||
  mongoose.model<IFriendRequest>('FriendRequest', friendRequestSchema);

export const DirectMessage: Model<IDirectMessage> =
  (mongoose.models.DirectMessage as Model<IDirectMessage>) ||
  mongoose.model<IDirectMessage>('DirectMessage', directMessageSchema);
