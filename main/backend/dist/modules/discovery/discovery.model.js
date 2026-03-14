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
exports.ServicesDiscoveryProjection = exports.OpenEventProjection = exports.CommunityFeedItem = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const communityFeedItemSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    item_type: { type: String, enum: ['post', 'event', 'ping'], required: true },
    item_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    published_at: { type: Date, required: true },
    visibility_flags: { type: mongoose_1.Schema.Types.Mixed }
}, { timestamps: false });
communityFeedItemSchema.index({ community_id: 1, published_at: -1 });
const openEventProjectionSchema = new mongoose_1.Schema({
    event_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, unique: true, index: true },
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
    start_at: { type: Date, required: true, index: true },
    is_public: { type: Boolean, required: true, index: true }
}, { timestamps: false });
openEventProjectionSchema.index({ is_public: 1, start_at: 1 });
openEventProjectionSchema.index({ location_point: '2dsphere' });
const servicesDiscoveryProjectionSchema = new mongoose_1.Schema({
    service_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, unique: true, index: true },
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    category: { type: String, required: true },
    status: { type: String, required: true },
    created_at: { type: Date, required: true }
}, { timestamps: false });
servicesDiscoveryProjectionSchema.index({ status: 1, created_at: -1 });
exports.CommunityFeedItem = mongoose_1.default.models.CommunityFeedItem ||
    mongoose_1.default.model('CommunityFeedItem', communityFeedItemSchema);
exports.OpenEventProjection = mongoose_1.default.models.OpenEventProjection ||
    mongoose_1.default.model('OpenEventProjection', openEventProjectionSchema);
exports.ServicesDiscoveryProjection = mongoose_1.default.models.ServicesDiscoveryProjection ||
    mongoose_1.default.model('ServicesDiscoveryProjection', servicesDiscoveryProjectionSchema);
