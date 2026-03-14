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
exports.CompatibilitySnapshot = exports.ProfileAnswer = exports.Question = exports.Friendship = exports.Profile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const profileSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, unique: true, index: true },
    display_name: { type: String, required: true },
    handle: { type: String, unique: true, sparse: true },
    avatar_url: { type: String },
    bio: { type: String },
    visibility_level: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public',
        required: true
    },
    interests: { type: [String], default: undefined },
    onboarding_completed: { type: Boolean, default: false, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
const friendshipSchema = new mongoose_1.Schema({
    user_low_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_high_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    requested_by_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
friendshipSchema.index({ user_low_id: 1, user_high_id: 1 }, { unique: true });
friendshipSchema.index({ status: 1, user_low_id: 1 });
friendshipSchema.index({ status: 1, user_high_id: 1 });
const questionSchema = new mongoose_1.Schema({
    scope: { type: String, enum: ['onboarding', 'profile_extension', 'riddle_template'], required: true },
    style: { type: String, enum: ['ab', 'preference', 'absurd'], required: true },
    topic: { type: String, required: true },
    prompt: { type: String, required: true },
    answer_format: {
        type: String,
        enum: ['single_choice', 'multi_choice', 'short_text'],
        required: true
    },
    options: { type: [String], default: undefined },
    source: { type: String, enum: ['editorial', 'ai'], default: 'editorial', required: true },
    is_active: { type: Boolean, default: true, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
questionSchema.index({ scope: 1, is_active: 1 });
questionSchema.index({ topic: 1, is_active: 1 });
const profileAnswerSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    question_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    answer_payload: { type: mongoose_1.Schema.Types.Mixed, required: true },
    visibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'private',
        required: true
    },
    origin: { type: String, enum: ['onboarding', 'manual', 'riddle'], required: true },
    riddle_id: { type: mongoose_1.Schema.Types.ObjectId },
    community_id: { type: mongoose_1.Schema.Types.ObjectId }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
profileAnswerSchema.index({ user_id: 1, created_at: -1 });
profileAnswerSchema.index({ question_id: 1, user_id: 1 });
profileAnswerSchema.index({ visibility: 1, community_id: 1 });
const compatibilitySnapshotSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    other_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: mongoose_1.Schema.Types.ObjectId },
    score: { type: Number, required: true },
    explanation_keys: { type: [String], required: true },
    computed_at: { type: Date, required: true },
    expires_at: { type: Date, required: true }
}, { timestamps: false });
compatibilitySnapshotSchema.index({ user_id: 1, other_user_id: 1, community_id: 1 }, { unique: true });
compatibilitySnapshotSchema.index({ user_id: 1, community_id: 1, score: -1 });
exports.Profile = mongoose_1.default.models.Profile || mongoose_1.default.model('Profile', profileSchema);
exports.Friendship = mongoose_1.default.models.Friendship ||
    mongoose_1.default.model('Friendship', friendshipSchema);
exports.Question = mongoose_1.default.models.Question || mongoose_1.default.model('Question', questionSchema);
exports.ProfileAnswer = mongoose_1.default.models.ProfileAnswer ||
    mongoose_1.default.model('ProfileAnswer', profileAnswerSchema);
exports.CompatibilitySnapshot = mongoose_1.default.models.CompatibilitySnapshot ||
    mongoose_1.default.model('CompatibilitySnapshot', compatibilitySnapshotSchema);
