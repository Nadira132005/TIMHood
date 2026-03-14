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
exports.CommunityRecognition = exports.CommunityAccessPolicy = exports.PublishRequest = exports.JoinRequest = exports.CommunityInvite = exports.CommunityMembership = exports.CommunitySettings = exports.Community = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("../../shared/constants/enums");
const communitySchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    created_by_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'public', required: true },
    state: { type: String, enum: enums_1.CommunityStates, default: 'active', required: true },
    members_count: { type: Number, default: 0, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
communitySchema.index({ visibility: 1, state: 1 });
const communitySettingsSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, unique: true, index: true },
    waiting_room_enabled: { type: Boolean, default: false, required: true },
    access_mode: { type: String, enum: enums_1.CommunityAccessModes, default: 'open', required: true },
    publish_mode: { type: String, enum: enums_1.PublishModes, default: 'direct', required: true },
    reply_mode: { type: String, enum: enums_1.ReplyModes, default: 'fully_allowed', required: true },
    allow_anonymous_participation: { type: Boolean, default: false, required: true },
    posts_enabled: { type: Boolean, default: true, required: true },
    events_enabled: { type: Boolean, default: true, required: true },
    polls_enabled: { type: Boolean, default: true, required: true },
    pings_enabled: { type: Boolean, default: false, required: true },
    services_enabled: { type: Boolean, default: true, required: true },
    daily_riddle_enabled: { type: Boolean, default: false, required: true },
    ping_monthly_limit_per_user: { type: Number },
    updated_by_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true }
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' } });
const communityMembershipSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: enums_1.CommunityRoles, default: 'member', required: true },
    status: { type: String, enum: enums_1.MembershipStatuses, default: 'pending', required: true },
    anonymous_alias: { type: String },
    invited_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    approved_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    joined_at: { type: Date },
    left_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
communityMembershipSchema.index({ community_id: 1, user_id: 1 }, { unique: true });
communityMembershipSchema.index({ community_id: 1, role: 1, status: 1 });
communityMembershipSchema.index({ user_id: 1, status: 1 });
const communityInviteSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    inviter_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    invitee_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'],
        default: 'pending',
        required: true
    },
    expires_at: { type: Date, required: true },
    responded_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
communityInviteSchema.index({ invitee_user_id: 1, status: 1, created_at: -1 });
communityInviteSchema.index({ community_id: 1, status: 1 });
const joinRequestSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    requester_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    message: { type: String },
    status: { type: String, enum: enums_1.DecisionStatuses, default: 'submitted', required: true },
    decided_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
joinRequestSchema.index({ community_id: 1, status: 1, created_at: 1 });
joinRequestSchema.index({ requester_user_id: 1, status: 1 });
const publishRequestSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    requester_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    content_type: { type: String, enum: ['post', 'event', 'ping', 'service'], required: true },
    payload_snapshot: { type: mongoose_1.Schema.Types.Mixed, required: true },
    status: { type: String, enum: enums_1.DecisionStatuses, default: 'submitted', required: true },
    created_content_type: { type: String, enum: ['post', 'event', 'ping', 'service'] },
    created_content_id: { type: mongoose_1.Schema.Types.ObjectId },
    decided_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
publishRequestSchema.index({ community_id: 1, status: 1, created_at: 1 });
publishRequestSchema.index({ requester_user_id: 1, status: 1, created_at: -1 });
const communityAccessPolicySchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, unique: true, index: true },
    requires_verification: { type: Boolean, default: true, required: true },
    location_match_scope: {
        type: String,
        enum: ['home', 'work', 'home_or_work'],
        default: 'home_or_work',
        required: true
    },
    eligibility_mode: {
        type: String,
        enum: ['none', 'city', 'radius', 'polygon'],
        default: 'none',
        required: true
    },
    city_codes: { type: [String], default: undefined },
    center_point: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number],
            validate: {
                validator(value) {
                    return !value || value.length === 2;
                },
                message: 'Coordinates must be [lng, lat]'
            }
        }
    },
    radius_km: { type: Number },
    polygon: { type: mongoose_1.Schema.Types.Mixed },
    is_active: { type: Boolean, default: true, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
communityAccessPolicySchema.index({ center_point: '2dsphere' });
communityAccessPolicySchema.index({ polygon: '2dsphere' });
const communityRecognitionSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    source_type: {
        type: String,
        enum: ['golden_comment', 'event_attendance', 'admin_award'],
        required: true
    },
    source_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    points_delta: { type: Number, required: true },
    note: { type: String },
    awarded_by_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    awarded_at: { type: Date, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
communityRecognitionSchema.index({ community_id: 1, user_id: 1, awarded_at: -1 });
exports.Community = mongoose_1.default.models.Community || mongoose_1.default.model('Community', communitySchema);
exports.CommunitySettings = mongoose_1.default.models.CommunitySettings ||
    mongoose_1.default.model('CommunitySettings', communitySettingsSchema);
exports.CommunityMembership = mongoose_1.default.models.CommunityMembership ||
    mongoose_1.default.model('CommunityMembership', communityMembershipSchema);
exports.CommunityInvite = mongoose_1.default.models.CommunityInvite ||
    mongoose_1.default.model('CommunityInvite', communityInviteSchema);
exports.JoinRequest = mongoose_1.default.models.JoinRequest ||
    mongoose_1.default.model('JoinRequest', joinRequestSchema);
exports.PublishRequest = mongoose_1.default.models.PublishRequest ||
    mongoose_1.default.model('PublishRequest', publishRequestSchema);
exports.CommunityAccessPolicy = mongoose_1.default.models.CommunityAccessPolicy ||
    mongoose_1.default.model('CommunityAccessPolicy', communityAccessPolicySchema);
exports.CommunityRecognition = mongoose_1.default.models.CommunityRecognition ||
    mongoose_1.default.model('CommunityRecognition', communityRecognitionSchema);
