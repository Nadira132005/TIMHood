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
exports.EventParticipant = exports.EventParticipationRequest = exports.EventShare = exports.EventRole = exports.Event = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("../../shared/constants/enums");
const eventSchema = new mongoose_1.Schema({
    origin_community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    creator_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
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
                validator(value) {
                    return Array.isArray(value) && value.length === 2;
                },
                message: 'Coordinates must be [lng, lat]'
            }
        }
    },
    location_label: { type: String, required: true },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    is_public: { type: Boolean, default: false, required: true },
    status: { type: String, enum: enums_1.EventStates, default: 'draft', required: true },
    roles_enabled: { type: Boolean, default: false, required: true },
    participants_count: { type: Number, default: 0, required: true },
    requests_count: { type: Number, default: 0, required: true },
    visible_in_community_ids: {
        type: [mongoose_1.Schema.Types.ObjectId],
        default: [],
        required: true
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
eventSchema.index({ origin_community_id: 1, status: 1, start_at: 1 });
eventSchema.index({ is_public: 1, status: 1, start_at: 1 });
eventSchema.index({ visible_in_community_ids: 1, status: 1, start_at: 1 });
eventSchema.index({ location_point: '2dsphere' });
const eventRoleSchema = new mongoose_1.Schema({
    event_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    capacity: { type: Number },
    accepted_count: { type: Number, default: 0, required: true },
    status: { type: String, enum: ['active', 'closed'], default: 'active', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
eventRoleSchema.index({ event_id: 1, name: 1 }, { unique: true });
eventRoleSchema.index({ event_id: 1, status: 1 });
const eventShareSchema = new mongoose_1.Schema({
    event_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    origin_community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    target_community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    requested_by_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: enums_1.EventShareStates, default: 'requested', required: true },
    decided_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
eventShareSchema.index({ event_id: 1, target_community_id: 1 }, { unique: true });
eventShareSchema.index({ target_community_id: 1, status: 1, created_at: 1 });
const eventParticipationRequestSchema = new mongoose_1.Schema({
    event_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    requester_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    requested_role_id: { type: mongoose_1.Schema.Types.ObjectId },
    message: { type: String },
    status: { type: String, enum: enums_1.EventRequestStates, default: 'requested', required: true },
    decided_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
eventParticipationRequestSchema.index({ event_id: 1, status: 1, created_at: 1 });
eventParticipationRequestSchema.index({ requester_user_id: 1, status: 1, created_at: -1 });
eventParticipationRequestSchema.index({ event_id: 1, requester_user_id: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: {
        status: { $in: ['requested'] }
    }
});
const eventParticipantSchema = new mongoose_1.Schema({
    event_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    role_id: { type: mongoose_1.Schema.Types.ObjectId },
    source_request_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    status: {
        type: String,
        enum: ['accepted', 'checked_in', 'cancelled'],
        default: 'accepted',
        required: true
    },
    accepted_by_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    accepted_at: { type: Date, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
eventParticipantSchema.index({ event_id: 1, user_id: 1 }, { unique: true });
eventParticipantSchema.index({ event_id: 1, status: 1 });
eventParticipantSchema.index({ user_id: 1, status: 1, accepted_at: -1 });
exports.Event = mongoose_1.default.models.Event || mongoose_1.default.model('Event', eventSchema);
exports.EventRole = mongoose_1.default.models.EventRole ||
    mongoose_1.default.model('EventRole', eventRoleSchema);
exports.EventShare = mongoose_1.default.models.EventShare ||
    mongoose_1.default.model('EventShare', eventShareSchema);
exports.EventParticipationRequest = mongoose_1.default.models.EventParticipationRequest ||
    mongoose_1.default.model('EventParticipationRequest', eventParticipationRequestSchema);
exports.EventParticipant = mongoose_1.default.models.EventParticipant ||
    mongoose_1.default.model('EventParticipant', eventParticipantSchema);
