"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const http_error_1 = require("../../shared/utils/http-error");
const identity_model_1 = require("./identity.model");
function hashDocumentNumber(documentNumber) {
    return crypto_1.default.createHash('sha256').update(documentNumber.trim()).digest('hex');
}
function encodeDocumentNumber(documentNumber) {
    return Buffer.from(documentNumber.trim(), 'utf8').toString('base64');
}
exports.identityService = {
    async getProofStatus(userId) {
        const user = await identity_model_1.User.findById(userId)
            .select('_id verification_state verified_at verification_locked_at')
            .lean();
        if (!user) {
            return null;
        }
        return {
            _id: String(user._id),
            verification_state: user.verification_state,
            verified_at: user.verified_at,
            verification_locked_at: user.verification_locked_at
        };
    },
    async submitProofOfWork(userId, documentNumber) {
        const trimmed = documentNumber.trim();
        if (!trimmed) {
            throw new http_error_1.HttpError(400, 'document_number cannot be empty');
        }
        const user = await identity_model_1.User.findById(userId);
        if (!user) {
            throw new http_error_1.HttpError(404, 'User not found');
        }
        if (user.verification_state === 'verified') {
            throw new http_error_1.HttpError(409, 'Document number proof already submitted and locked');
        }
        const docHash = hashDocumentNumber(trimmed);
        const existingOwner = await identity_model_1.User.findOne({ document_number_hash: docHash }).select('_id').lean();
        if (existingOwner) {
            throw new http_error_1.HttpError(409, 'Document number already used');
        }
        const now = new Date();
        user.document_number_encrypted = encodeDocumentNumber(trimmed);
        user.document_number_hash = docHash;
        user.verification_state = 'verified';
        user.verified_at = now;
        user.verification_locked_at = now;
        await user.save();
        return {
            _id: String(user._id),
            verification_state: user.verification_state,
            verified_at: user.verified_at,
            verification_locked_at: user.verification_locked_at
        };
    },
    async upsertLocations(userId, payload) {
        const user = await identity_model_1.User.findById(userId).select('_id verification_state').lean();
        if (!user) {
            throw new http_error_1.HttpError(404, 'User not found');
        }
        if (user.verification_state !== 'verified') {
            throw new http_error_1.HttpError(403, 'Document number proof required before saving locations');
        }
        return identity_model_1.UserLocation.findOneAndUpdate({ user_id: user._id }, {
            user_id: user._id,
            home_location_point: payload.home_location_point,
            home_location_label: payload.home_location_label,
            home_place_id: payload.home_place_id,
            home_input_source: payload.home_input_source,
            work_location_point: payload.work_location_point,
            work_location_label: payload.work_location_label,
            work_place_id: payload.work_place_id,
            work_input_source: payload.work_input_source,
            is_active: true
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }).lean();
    }
};
