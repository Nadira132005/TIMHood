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
exports.PingQuotaUsage = exports.PingResponse = exports.Ping = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("../../shared/constants/enums");
const pingSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    creator_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
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
    location_label: { type: String },
    status: { type: String, enum: enums_1.PingStates, default: 'active', required: true },
    responses_count: { type: Number, default: 0, required: true },
    expires_at: { type: Date, required: true },
    resolved_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
pingSchema.index({ community_id: 1, status: 1, created_at: -1 });
pingSchema.index({ creator_user_id: 1, created_at: -1 });
pingSchema.index({ location_point: '2dsphere' });
pingSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
const pingResponseSchema = new mongoose_1.Schema({
    ping_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    responder_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, enum: ['will_help', 'withdrawn'], default: 'will_help', required: true },
    responded_at: { type: Date, required: true }
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' } });
pingResponseSchema.index({ ping_id: 1, responder_user_id: 1 }, { unique: true });
pingResponseSchema.index({ ping_id: 1, status: 1, responded_at: 1 });
const pingQuotaUsageSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    year_month: { type: String, required: true },
    created_count: { type: Number, default: 0, required: true }
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' } });
pingQuotaUsageSchema.index({ community_id: 1, user_id: 1, year_month: 1 }, { unique: true });
exports.Ping = mongoose_1.default.models.Ping || mongoose_1.default.model('Ping', pingSchema);
exports.PingResponse = mongoose_1.default.models.PingResponse ||
    mongoose_1.default.model('PingResponse', pingResponseSchema);
exports.PingQuotaUsage = mongoose_1.default.models.PingQuotaUsage ||
    mongoose_1.default.model('PingQuotaUsage', pingQuotaUsageSchema);
