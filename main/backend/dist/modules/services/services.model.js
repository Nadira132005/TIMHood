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
exports.ServiceReview = exports.ServiceApplication = exports.Service = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("../../shared/constants/enums");
const serviceSchema = new mongoose_1.Schema({
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    creator_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    preferred_mode: {
        type: String,
        enum: ['online', 'in_person', 'flexible'],
        required: true
    },
    preferred_location_label: { type: String },
    preferred_location_point: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
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
    preferred_time_start: { type: Date },
    preferred_time_end: { type: Date },
    status: {
        type: String,
        enum: enums_1.ServiceStates,
        default: 'open',
        required: true
    },
    accepts_new_applications: { type: Boolean, default: true, required: true },
    applications_count: { type: Number, default: 0, required: true },
    selected_application_id: { type: mongoose_1.Schema.Types.ObjectId },
    selected_helper_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    completed_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
serviceSchema.index({ community_id: 1, status: 1, created_at: -1 });
serviceSchema.index({ status: 1, created_at: -1 });
serviceSchema.index({ preferred_location_point: '2dsphere' }, { sparse: true });
const serviceApplicationSchema = new mongoose_1.Schema({
    service_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    community_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    applicant_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    message: { type: String },
    status: {
        type: String,
        enum: enums_1.ServiceApplicationStates,
        default: 'submitted',
        required: true
    },
    decided_by_user_id: { type: mongoose_1.Schema.Types.ObjectId },
    decided_at: { type: Date },
    decision_reason: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
serviceApplicationSchema.index({ service_id: 1, applicant_user_id: 1 }, { unique: true });
serviceApplicationSchema.index({ service_id: 1, status: 1, created_at: 1 });
serviceApplicationSchema.index({ applicant_user_id: 1, status: 1, created_at: -1 });
const serviceReviewSchema = new mongoose_1.Schema({
    service_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    reviewer_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    reviewee_user_id: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    reviewer_role: { type: String, enum: ['creator', 'helper'], required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
serviceReviewSchema.index({ service_id: 1, reviewer_user_id: 1 }, { unique: true });
serviceReviewSchema.index({ reviewee_user_id: 1, created_at: -1 });
exports.Service = mongoose_1.default.models.Service || mongoose_1.default.model('Service', serviceSchema);
exports.ServiceApplication = mongoose_1.default.models.ServiceApplication ||
    mongoose_1.default.model('ServiceApplication', serviceApplicationSchema);
exports.ServiceReview = mongoose_1.default.models.ServiceReview ||
    mongoose_1.default.model('ServiceReview', serviceReviewSchema);
