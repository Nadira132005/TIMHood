"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = exports.Notification = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const notificationSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true },
    actor_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    entity_type: { type: String, required: true },
    entity_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    payload: { type: mongoose_1.Schema.Types.Mixed, required: true },
    read_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
notificationSchema.index({ user_id: 1, read_at: 1, created_at: -1 });
const auditLogSchema = new mongoose_1.Schema({
    actor_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    action_type: { type: String, required: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: mongoose_1.Schema.Types.ObjectId, index: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
auditLogSchema.index({ community_id: 1, created_at: -1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
auditLogSchema.index({ actor_user_id: 1, created_at: -1 });
exports.Notification = mongoose_1.default.models.Notification ||
    mongoose_1.default.model('Notification', notificationSchema);
exports.AuditLog = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', auditLogSchema);
