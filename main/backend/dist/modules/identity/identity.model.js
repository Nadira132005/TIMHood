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
exports.UserLocation = exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("../../shared/constants/enums");
const userSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    password_hash: { type: String, required: true },
    account_status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    document_number_encrypted: { type: String },
    document_number_hash: { type: String, unique: true, sparse: true },
    verification_state: {
        type: String,
        enum: enums_1.VerificationStates,
        default: 'unverified',
        required: true
    },
    verified_at: { type: Date },
    verification_locked_at: { type: Date },
    last_seen_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
const pointSchema = {
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
};
const optionalPointSchema = {
    type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
    },
    coordinates: {
        type: [Number],
        validate: {
            validator(value) {
                return value === undefined || (Array.isArray(value) && value.length === 2);
            },
            message: 'Coordinates must be [lng, lat]'
        }
    }
};
const userLocationSchema = new mongoose_1.Schema({
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    home_location_point: { type: pointSchema, required: true },
    home_location_label: { type: String },
    home_place_id: { type: String },
    home_input_source: {
        type: String,
        enum: ['pin_drop', 'maps_place_input'],
        required: true
    },
    work_location_point: { type: optionalPointSchema, required: false },
    work_location_label: { type: String },
    work_place_id: { type: String },
    work_input_source: { type: String, enum: ['pin_drop', 'maps_place_input'] },
    is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
userLocationSchema.index({ home_location_point: '2dsphere' });
userLocationSchema.index({ work_location_point: '2dsphere' }, { sparse: true });
exports.User = mongoose_1.default.models.User || mongoose_1.default.model('User', userSchema);
exports.UserLocation = mongoose_1.default.models.UserLocation ||
    mongoose_1.default.model('UserLocation', userLocationSchema);
