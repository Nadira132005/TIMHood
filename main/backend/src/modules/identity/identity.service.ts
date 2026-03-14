import crypto from 'crypto';

import { HttpError } from '../../shared/utils/http-error';
import { User, UserLocation } from './identity.model';

type ProofStatusResponse = {
  _id: string;
  verification_state: 'unverified' | 'verified';
  verified_at?: Date;
  verification_locked_at?: Date;
};

type LocationPayload = {
  home_location_point: {
    type: 'Point';
    coordinates: [number, number];
  };
  home_location_label?: string;
  home_place_id?: string;
  home_input_source: 'pin_drop' | 'maps_place_input';
  work_location_point?: {
    type: 'Point';
    coordinates: [number, number];
  };
  work_location_label?: string;
  work_place_id?: string;
  work_input_source?: 'pin_drop' | 'maps_place_input';
};

function hashDocumentNumber(documentNumber: string): string {
  return crypto.createHash('sha256').update(documentNumber.trim()).digest('hex');
}

function encodeDocumentNumber(documentNumber: string): string {
  return Buffer.from(documentNumber.trim(), 'utf8').toString('base64');
}

export const identityService = {
  async getProofStatus(userId: string): Promise<ProofStatusResponse | null> {
    const user = await User.findById(userId)
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

  async submitProofOfWork(userId: string, documentNumber: string): Promise<ProofStatusResponse> {
    const trimmed = documentNumber.trim();
    if (!trimmed) {
      throw new HttpError(400, 'document_number cannot be empty');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (user.verification_state === 'verified') {
      throw new HttpError(409, 'Document number proof already submitted and locked');
    }

    const docHash = hashDocumentNumber(trimmed);
    const existingOwner = await User.findOne({ document_number_hash: docHash }).select('_id').lean();

    if (existingOwner) {
      throw new HttpError(409, 'Document number already used');
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

  async upsertLocations(userId: string, payload: LocationPayload) {
    const user = await User.findById(userId).select('_id verification_state').lean();

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (user.verification_state !== 'verified') {
      throw new HttpError(403, 'Document number proof required before saving locations');
    }

    return UserLocation.findOneAndUpdate(
      { user_id: user._id },
      {
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
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).lean();
  }
};
