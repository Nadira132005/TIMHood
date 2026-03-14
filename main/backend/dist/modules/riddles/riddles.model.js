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
exports.RiddleResponse = exports.Riddle = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("../../shared/constants/enums");
const riddleSchema = new mongoose_1.Schema({
    creator_type: { type: String, enum: ['system', 'user'], required: true },
    creator_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    scope: { type: String, enum: ['community', 'interest', 'friend_direct'], required: true },
    community_id: { type: mongoose_1.Schema.Types.ObjectId },
    interest_tag: { type: String },
    prompt: { type: String, required: true },
    answer_format: {
        type: String,
        enum: ['single_choice', 'multi_choice', 'short_text'],
        required: true
    },
    options: { type: [String], default: undefined },
    status: { type: String, enum: enums_1.RiddleStates, default: 'scheduled', required: true },
    publish_at: { type: Date, required: true },
    close_at: { type: Date, required: true },
    moderation_status: {
        type: String,
        enum: ['approved', 'rejected', 'pending'],
        default: 'approved',
        required: true
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
riddleSchema.index({ scope: 1, status: 1, publish_at: 1 });
riddleSchema.index({ community_id: 1, status: 1, publish_at: -1 });
riddleSchema.index({ interest_tag: 1, status: 1, publish_at: -1 });
const riddleResponseSchema = new mongoose_1.Schema({
    riddle_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    answer_payload: { type: mongoose_1.Schema.Types.Mixed, required: true },
    visibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'private',
        required: true
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
riddleResponseSchema.index({ riddle_id: 1, user_id: 1 }, { unique: true });
riddleResponseSchema.index({ riddle_id: 1, visibility: 1 });
riddleResponseSchema.index({ user_id: 1, created_at: -1 });
exports.Riddle = mongoose_1.default.models.Riddle || mongoose_1.default.model('Riddle', riddleSchema);
exports.RiddleResponse = mongoose_1.default.models.RiddleResponse ||
    mongoose_1.default.model('RiddleResponse', riddleResponseSchema);
