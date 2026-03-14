import mongoose, { Model, Schema } from 'mongoose';

interface INotification {
  user_id: mongoose.Types.ObjectId;
  type: string;
  actor_user_id?: mongoose.Types.ObjectId;
  entity_type: string;
  entity_id: mongoose.Types.ObjectId;
  payload: Record<string, unknown>;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface IAuditLog {
  actor_user_id: mongoose.Types.ObjectId;
  action_type: string;
  entity_type: string;
  entity_id: mongoose.Types.ObjectId;
  community_id?: mongoose.Types.ObjectId;
  metadata: Record<string, unknown>;
  created_at: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true },
    actor_user_id: { type: Schema.Types.ObjectId },
    entity_type: { type: String, required: true },
    entity_id: { type: Schema.Types.ObjectId, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    read_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

notificationSchema.index({ user_id: 1, read_at: 1, created_at: -1 });

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor_user_id: { type: Schema.Types.ObjectId, required: true, index: true },
    action_type: { type: String, required: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: Schema.Types.ObjectId, index: true },
    metadata: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

auditLogSchema.index({ community_id: 1, created_at: -1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
auditLogSchema.index({ actor_user_id: 1, created_at: -1 });

export const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>('Notification', notificationSchema);

export const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
