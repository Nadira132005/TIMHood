import crypto from 'crypto';

import { HttpError } from '../../shared/utils/http-error';
import { communitiesService } from '../communities/communities.service';
import { neighborhoodsService } from '../neighborhoods/neighborhoods.service';
import { FriendRequest } from '../social/social.model';
import { User, UserLocation } from './identity.model';
import { resolveNeighborhood } from './neighborhood-resolver';

type NfcLoginPayload = {
  documentNumber: string;
  firstName: string;
  lastName: string;
  nationality: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  issuingState?: string;
  photoBase64?: string;
};

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

type FixedProfileResponse = {
  userId: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  issuingState?: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  photoBase64?: string;
  bio?: string;
  showPhotoToOthers: boolean;
  showAgeToOthers: boolean;
  documentIsValid: boolean;
  homeAddressLabel?: string;
  homeNeighborhood?: string | null;
};

type PublicProfileResponse = {
  userId: string;
  fullName: string;
  photoBase64?: string;
  bio?: string;
  age?: number;
  neighborhood?: string | null;
  lastSeenAt?: string;
};

type NfcLoginResponse = {
  userId: string;
  profile: FixedProfileResponse;
};

type DemoLoginPayload = {
  can: string;
};

type AddressOnboardingPayload = {
  addressLabel: string;
  neighborhood?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
};

type AddressOnboardingResponse = {
  userId: string;
  addressLabel: string;
  neighborhood: string | null;
  neighborhoodResolutionMode: 'manual_selection' | 'coordinate_resolution';
};

function hashDocumentNumber(documentNumber: string): string {
  return crypto.createHash('sha256').update(documentNumber.trim()).digest('hex');
}

function encodeDocumentNumber(documentNumber: string): string {
  return Buffer.from(documentNumber.trim(), 'utf8').toString('base64');
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function parseMrzDate(value: string, field: string): Date {
  const normalized = value.trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new HttpError(400, `${field} must use YYMMDD format`);
  }

  const yy = Number(normalized.slice(0, 2));
  const month = Number(normalized.slice(2, 4));
  const day = Number(normalized.slice(4, 6));
  const currentTwoDigitYear = new Date().getUTCFullYear() % 100;
  let fullYear = 2000 + yy;

  if (field === 'dateOfBirth' && yy > currentTwoDigitYear) {
    fullYear = 1900 + yy;
  }

  const parsed = new Date(Date.UTC(fullYear, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== fullYear ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new HttpError(400, `${field} is not a valid calendar date`);
  }

  return parsed;
}

function toIsoDate(value?: Date): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function buildFixedProfile(user: {
  document_number?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  nationality?: string;
  issuing_state?: string;
  date_of_birth?: Date;
  date_of_expiry?: Date;
  profile_photo_base64?: string;
  bio?: string;
  show_photo_to_others?: boolean;
  show_age_to_others?: boolean;
  home_address_label?: string;
  home_neighborhood?: string;
}): FixedProfileResponse {
  if (
    !user.document_number ||
    !user.first_name ||
    !user.last_name ||
    !user.full_name ||
    !user.nationality ||
    !user.date_of_birth ||
    !user.date_of_expiry
  ) {
    throw new HttpError(500, 'Stored identity profile is incomplete');
  }

  return {
    userId: user.document_number,
    documentNumber: user.document_number,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    nationality: user.nationality,
    issuingState: user.issuing_state,
    dateOfBirth: toIsoDate(user.date_of_birth)!,
    dateOfExpiry: toIsoDate(user.date_of_expiry)!,
    photoBase64: user.profile_photo_base64,
    bio: user.bio,
    showPhotoToOthers: user.show_photo_to_others ?? true,
    showAgeToOthers: user.show_age_to_others ?? true,
    documentIsValid: user.date_of_expiry.getTime() >= Date.now(),
    homeAddressLabel: user.home_address_label,
    homeNeighborhood: user.home_neighborhood ?? null
  };
}

async function getRelationshipStatus(userId: string, targetUserId: string): Promise<'self' | 'friends' | 'request_sent' | 'request_received' | 'none'> {
  if (userId === targetUserId) {
    return 'self';
  }

  const [sent, received] = await Promise.all([
    FriendRequest.findOne({ from_user_id: userId, to_user_id: targetUserId }).lean(),
    FriendRequest.findOne({ from_user_id: targetUserId, to_user_id: userId }).lean()
  ]);

  if (sent?.status === 'accepted' || received?.status === 'accepted') {
    return 'friends';
  }
  if (sent?.status === 'pending') {
    return 'request_sent';
  }
  if (received?.status === 'pending') {
    return 'request_received';
  }
  return 'none';
}

function getAge(dateOfBirth?: Date): number | undefined {
  if (!dateOfBirth) {
    return undefined;
  }

  const today = new Date();
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dateOfBirth.getUTCMonth();
  const dayDiff = today.getUTCDate() - dateOfBirth.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function buildDemoAvatar(firstName: string, lastName: string, background: string): string {
  const initials = `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="52" fill="url(#g)" />
      <circle cx="120" cy="120" r="74" fill="rgba(255,255,255,0.16)" />
      <text x="120" y="142" text-anchor="middle" font-family="Arial" font-size="72" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEMO_USERS: Record<
  string,
  {
    documentNumber: string;
    firstName: string;
    lastName: string;
    nationality: string;
    issuingState: string;
    dateOfBirth: string;
    dateOfExpiry: string;
    bio: string;
    homeAddressLabel: string;
    homeNeighborhood: string;
    photoDataUri: string;
  }
> = {
  '0000': {
    documentNumber: 'SOARELUI-DEMO-0000',
    firstName: 'Mara',
    lastName: 'Popescu',
    nationality: 'ROU',
    issuingState: 'ROU',
    dateOfBirth: '980412',
    dateOfExpiry: '351231',
    bio: 'Coffee walks, school pickup coordination, and neighborhood updates.',
    homeAddressLabel: 'Aleea FC Ripensia 12',
    homeNeighborhood: 'Soarelui',
    photoDataUri: buildDemoAvatar('Mara', 'Popescu', '#A855F7')
  },
  '0001': {
    documentNumber: 'SOARELUI-DEMO-0001',
    firstName: 'Andrei',
    lastName: 'Ionescu',
    nationality: 'ROU',
    issuingState: 'ROU',
    dateOfBirth: '910225',
    dateOfExpiry: '351231',
    bio: 'Plays football on weekends and helps with small repairs.',
    homeAddressLabel: 'Strada Sirius 8',
    homeNeighborhood: 'Soarelui',
    photoDataUri: buildDemoAvatar('Andrei', 'Ionescu', '#0F766E')
  },
  '0002': {
    documentNumber: 'SOARELUI-DEMO-0002',
    firstName: 'Teodora',
    lastName: 'Marin',
    nationality: 'ROU',
    issuingState: 'ROU',
    dateOfBirth: '960903',
    dateOfExpiry: '351231',
    bio: 'Pet-friendly neighbor, marketplace regular, and event organizer.',
    homeAddressLabel: 'Bulevardul Sudului 18',
    homeNeighborhood: 'Soarelui',
    photoDataUri: buildDemoAvatar('Teodora', 'Marin', '#EA580C')
  }
};

export const identityService = {
  async loginWithDemoCan(payload: DemoLoginPayload): Promise<NfcLoginResponse> {
    const can = payload.can.trim();
    const demoUser = DEMO_USERS[can];

    if (!demoUser) {
      throw new HttpError(404, 'Unknown demo CAN');
    }

    const dateOfBirth = parseMrzDate(demoUser.dateOfBirth, 'dateOfBirth');
    const dateOfExpiry = parseMrzDate(demoUser.dateOfExpiry, 'dateOfExpiry');
    const now = new Date();
    const canonicalNeighborhood = await neighborhoodsService.getCanonicalNeighborhoodName(
      demoUser.homeNeighborhood
    );

    const savedUser = await User.findOneAndUpdate(
      { _id: demoUser.documentNumber },
      {
        $set: {
          document_number: demoUser.documentNumber,
          document_number_encrypted: encodeDocumentNumber(demoUser.documentNumber),
          document_number_hash: hashDocumentNumber(demoUser.documentNumber),
          first_name: demoUser.firstName,
          last_name: demoUser.lastName,
          full_name: `${demoUser.firstName} ${demoUser.lastName}`,
          nationality: demoUser.nationality,
          issuing_state: demoUser.issuingState,
          date_of_birth: dateOfBirth,
          date_of_expiry: dateOfExpiry,
          profile_photo_base64: demoUser.photoDataUri,
          bio: demoUser.bio,
          show_photo_to_others: true,
          show_age_to_others: true,
          home_address_label: demoUser.homeAddressLabel,
          home_neighborhood: canonicalNeighborhood,
          verification_state: 'verified',
          document_checked_at: now,
          last_seen_at: now
        },
        $setOnInsert: {
          _id: demoUser.documentNumber,
          account_status: 'active',
          verified_at: now,
          verification_locked_at: now
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    if (!savedUser) {
      throw new HttpError(500, 'Failed to save demo user');
    }

    await communitiesService.ensureNeighborhoodGroupsForUser(
      demoUser.documentNumber,
      canonicalNeighborhood
    );

    return {
      userId: demoUser.documentNumber,
      profile: buildFixedProfile(savedUser)
    };
  },

  async loginWithNfc(payload: NfcLoginPayload): Promise<NfcLoginResponse> {
    const documentNumber = payload.documentNumber.trim().toUpperCase();
    const firstName = normalizeName(payload.firstName);
    const lastName = normalizeName(payload.lastName);
    const nationality = payload.nationality.trim().toUpperCase();
    const issuingState = payload.issuingState?.trim().toUpperCase() || undefined;

    if (!documentNumber) {
      throw new HttpError(400, 'documentNumber is required');
    }

    if (!firstName || !lastName || !nationality) {
      throw new HttpError(400, 'firstName, lastName, and nationality are required');
    }

    const dateOfBirth = parseMrzDate(payload.dateOfBirth, 'dateOfBirth');
    const dateOfExpiry = parseMrzDate(payload.dateOfExpiry, 'dateOfExpiry');
    if (dateOfExpiry.getTime() < Date.now()) {
      throw new HttpError(400, 'Document is expired');
    }

    const now = new Date();
    const fullName = `${firstName} ${lastName}`.trim();
    const documentNumberHash = hashDocumentNumber(documentNumber);
    const documentNumberEncoded = encodeDocumentNumber(documentNumber);
    const duplicateWithDifferentId = await User.findOne({
      document_number: documentNumber,
      _id: { $ne: documentNumber }
    })
      .select('_id')
      .lean();

    if (duplicateWithDifferentId) {
      throw new HttpError(
        409,
        `Duplicate user exists for document_number ${documentNumber}. Clean old rows before retrying.`
      );
    }

    const existingUser = await User.findById(documentNumber);
    if (existingUser) {
      const fixedFieldsMatch =
        existingUser.first_name === firstName &&
        existingUser.last_name === lastName &&
        existingUser.nationality === nationality &&
        existingUser.issuing_state === issuingState &&
        toIsoDate(existingUser.date_of_birth) === toIsoDate(dateOfBirth) &&
        toIsoDate(existingUser.date_of_expiry) === toIsoDate(dateOfExpiry);

      if (!fixedFieldsMatch) {
        throw new HttpError(409, 'Stored document identity does not match the NFC read');
      }
    }

    const savedUser = await User.findOneAndUpdate(
      { _id: documentNumber },
      {
        $set: {
          document_number: documentNumber,
          document_number_encrypted: documentNumberEncoded,
          document_number_hash: documentNumberHash,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          nationality,
          issuing_state: issuingState,
          date_of_birth: dateOfBirth,
          date_of_expiry: dateOfExpiry,
          profile_photo_base64: payload.photoBase64,
          show_photo_to_others: true,
          show_age_to_others: true,
          verification_state: 'verified',
          document_checked_at: now,
          last_seen_at: now
        },
        $setOnInsert: {
          _id: documentNumber,
          account_status: 'active',
          verified_at: now,
          verification_locked_at: now
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    if (!savedUser) {
      throw new HttpError(500, 'Failed to save NFC login user');
    }

    return {
      userId: documentNumber,
      profile: buildFixedProfile(savedUser)
    };
  },

  async getFixedProfile(documentNumber: string): Promise<FixedProfileResponse | null> {
    const user = await User.findOne({ document_number: documentNumber.trim().toUpperCase() })
      .select(
        'document_number first_name last_name full_name nationality issuing_state date_of_birth date_of_expiry profile_photo_base64 bio show_photo_to_others show_age_to_others home_address_label home_neighborhood'
      )
      .lean();

    if (!user) {
      return null;
    }

    return buildFixedProfile(user);
  },

  async getPublicProfile(userId: string, viewerUserId?: string): Promise<PublicProfileResponse | null> {
    const user = await User.findById(userId)
      .select('full_name profile_photo_base64 bio date_of_birth home_neighborhood last_seen_at show_photo_to_others show_age_to_others')
      .lean();

    if (!user) {
      return null;
    }

    const relationship = viewerUserId ? await getRelationshipStatus(viewerUserId, userId) : 'none';
    const canSeePrivateFields = relationship === 'self';

    return {
      userId,
      fullName: user.full_name || userId,
      photoBase64: canSeePrivateFields || user.show_photo_to_others ? user.profile_photo_base64 : undefined,
      bio: user.bio,
      age: canSeePrivateFields || user.show_age_to_others ? getAge(user.date_of_birth) : undefined,
      neighborhood: user.home_neighborhood ?? null,
      lastSeenAt: user.last_seen_at?.toISOString()
    };
  },

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
  },

  async saveHomeAddress(userId: string, payload: AddressOnboardingPayload): Promise<AddressOnboardingResponse> {
    const addressLabel = payload.addressLabel.trim();
    const neighborhood = payload.neighborhood?.trim() || '';
    if (!addressLabel) {
      throw new HttpError(400, 'addressLabel is required');
    }

    let resolvedNeighborhoodFromPoint: string | null = null;

    const user = await User.findById(userId);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (payload.location) {
      if (
        payload.location.type !== 'Point' ||
        !Array.isArray(payload.location.coordinates) ||
        payload.location.coordinates.length !== 2
      ) {
        throw new HttpError(400, 'location must be a GeoJSON Point when provided');
      }

      const resolverResult = resolveNeighborhood(payload.location);
      resolvedNeighborhoodFromPoint = resolverResult.neighborhood;
      await UserLocation.findOneAndUpdate(
        { user_id: user._id },
        {
          user_id: user._id,
          home_location_point: payload.location,
          home_location_label: addressLabel,
          home_input_source: 'maps_place_input',
          is_active: true
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      ).lean();
    }

    const effectiveNeighborhood = neighborhood || resolvedNeighborhoodFromPoint;
    if (!effectiveNeighborhood) {
      throw new HttpError(400, 'neighborhood is required');
    }

    const canonicalNeighborhood = await neighborhoodsService.getCanonicalNeighborhoodName(effectiveNeighborhood);

    user.home_address_label = addressLabel;
    user.home_neighborhood = canonicalNeighborhood;
    await user.save();
    await communitiesService.ensureNeighborhoodGroupsForUser(userId, canonicalNeighborhood);

    return {
      userId: user._id,
      addressLabel,
      neighborhood: user.home_neighborhood ?? canonicalNeighborhood,
      neighborhoodResolutionMode: neighborhood ? 'manual_selection' : 'coordinate_resolution'
    };
  },

  async saveBio(userId: string, bio: string): Promise<FixedProfileResponse> {
    const normalizedBio = bio.trim();
    const user = await User.findById(userId);

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    user.bio = normalizedBio.slice(0, 280);
    await user.save();

    return buildFixedProfile(user);
  },

  async savePrivacySettings(
    userId: string,
    payload: { showPhotoToOthers: boolean; showAgeToOthers: boolean }
  ): Promise<FixedProfileResponse> {
    const user = await User.findById(userId);

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    user.show_photo_to_others = payload.showPhotoToOthers;
    user.show_age_to_others = payload.showAgeToOthers;
    await user.save();

    return buildFixedProfile(user);
  }
};
