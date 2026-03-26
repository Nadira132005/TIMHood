import crypto from "crypto";

import {
  buildInitialsAvatar,
  ensureStoredProfilePhoto,
  isGeneratedAvatarDataUri,
  resolveVisibleProfilePhoto,
} from "../../shared/utils/avatar";
import { HttpError } from "../../shared/utils/http-error";
import { communitiesService } from "../communities/communities.service";
import { neighborhoodsService } from "../neighborhoods/neighborhoods.service";
import { FriendRequest } from "../social/social.model";
import { User, UserLocation } from "./identity.model";
import { resolveNeighborhood } from "./neighborhood-resolver";
import { createAuthToken } from "../../shared/utils/auth-token";
import { NfcEvidencePayload, nfcVerifier } from "./nfc-verifier";

type NfcLoginPayload = {
  challengeId: string;
  evidence: NfcEvidencePayload;
};

type ProofStatusResponse = {
  _id: string;
  verification_state: "unverified" | "verified";
  verified_at?: Date;
  verification_locked_at?: Date;
};

type LocationPayload = {
  home_location_point: {
    type: "Point";
    coordinates: [number, number];
  };
  home_location_label?: string;
  home_place_id?: string;
  home_input_source: "pin_drop" | "maps_place_input";
  work_location_point?: {
    type: "Point";
    coordinates: [number, number];
  };
  work_location_label?: string;
  work_place_id?: string;
  work_input_source?: "pin_drop" | "maps_place_input";
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
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  profile: FixedProfileResponse;
};

type DemoLoginPayload = {
  can: string;
};

type AddressOnboardingPayload = {
  addressLabel: string;
  neighborhood?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
};

type AddressOnboardingResponse = {
  userId: string;
  addressLabel: string;
  neighborhood: string | null;
  neighborhoodResolutionMode: "manual_selection" | "coordinate_resolution";
};

function hashDocumentNumber(documentNumber: string): string {
  return crypto
    .createHash("sha256")
    .update(documentNumber.trim())
    .digest("hex");
}

function encodeDocumentNumber(documentNumber: string): string {
  return Buffer.from(documentNumber.trim(), "utf8").toString("base64");
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
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

  if (field === "dateOfBirth" && yy > currentTwoDigitYear) {
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
  verified_profile_photo_base64?: string;
  avatar_photo_base64?: string;
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
    throw new HttpError(500, "Stored identity profile is incomplete");
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
    photoBase64:
      user.verified_profile_photo_base64 ||
      (user.profile_photo_base64 &&
      !isGeneratedAvatarDataUri(user.profile_photo_base64)
        ? user.profile_photo_base64
        : undefined) ||
      user.avatar_photo_base64 ||
      ensureStoredProfilePhoto({
        fullName: user.full_name,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePhotoBase64: user.profile_photo_base64,
        fallbackLabel: user.document_number,
      }),
    bio: user.bio,
    showPhotoToOthers: user.show_photo_to_others ?? true,
    showAgeToOthers: user.show_age_to_others ?? true,
    documentIsValid: user.date_of_expiry.getTime() >= Date.now(),
    homeAddressLabel: user.home_address_label,
    homeNeighborhood: user.home_neighborhood ?? null,
  };
}

async function getRelationshipStatus(
  userId: string,
  targetUserId: string,
): Promise<"self" | "friends" | "request_sent" | "request_received" | "none"> {
  if (userId === targetUserId) {
    return "self";
  }

  const [sent, received] = await Promise.all([
    FriendRequest.findOne({
      from_user_id: userId,
      to_user_id: targetUserId,
    }).lean(),
    FriendRequest.findOne({
      from_user_id: targetUserId,
      to_user_id: userId,
    }).lean(),
  ]);

  if (sent?.status === "accepted" || received?.status === "accepted") {
    return "friends";
  }
  if (sent?.status === "pending") {
    return "request_sent";
  }
  if (received?.status === "pending") {
    return "request_received";
  }
  return "none";
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
  "0000": {
    documentNumber: "SOARELUI-DEMO-0000",
    firstName: "Mara",
    lastName: "Popescu",
    nationality: "ROU",
    issuingState: "ROU",
    dateOfBirth: "980412",
    dateOfExpiry: "351231",
    bio: "Coffee walks, school pickup coordination, and neighborhood updates.",
    homeAddressLabel: "Aleea FC Ripensia 12",
    homeNeighborhood: "Soarelui",
    photoDataUri: buildInitialsAvatar("Mara Popescu"),
  },
  "0001": {
    documentNumber: "SOARELUI-DEMO-0001",
    firstName: "Andrei",
    lastName: "Ionescu",
    nationality: "ROU",
    issuingState: "ROU",
    dateOfBirth: "910225",
    dateOfExpiry: "351231",
    bio: "Plays football on weekends and helps with small repairs.",
    homeAddressLabel: "Strada Sirius 8",
    homeNeighborhood: "Soarelui",
    photoDataUri: buildInitialsAvatar("Andrei Ionescu"),
  },
  "0002": {
    documentNumber: "SOARELUI-DEMO-0002",
    firstName: "Teodora",
    lastName: "Marin",
    nationality: "ROU",
    issuingState: "ROU",
    dateOfBirth: "960903",
    dateOfExpiry: "351231",
    bio: "Pet-friendly neighbor, marketplace regular, and event organizer.",
    homeAddressLabel: "Bulevardul Sudului 18",
    homeNeighborhood: "Soarelui",
    photoDataUri: buildInitialsAvatar("Teodora Marin"),
  },
};

export const identityService = {
  issueNfcChallenge() {
    return nfcVerifier.issueChallenge();
  },

  async loginWithDemoCan(payload: DemoLoginPayload): Promise<NfcLoginResponse> {
    const can = payload.can.trim();
    const demoUser = DEMO_USERS[can];

    if (!demoUser) {
      throw new HttpError(404, "Unknown demo CAN");
    }

    const dateOfBirth = parseMrzDate(demoUser.dateOfBirth, "dateOfBirth");
    const dateOfExpiry = parseMrzDate(demoUser.dateOfExpiry, "dateOfExpiry");
    const now = new Date();
    const canonicalNeighborhood =
      await neighborhoodsService.getCanonicalNeighborhoodName(
        demoUser.homeNeighborhood,
      );

    const savedUser = await User.findOneAndUpdate(
      { _id: demoUser.documentNumber },
      {
        $set: {
          document_number: demoUser.documentNumber,
          document_number_encrypted: encodeDocumentNumber(
            demoUser.documentNumber,
          ),
          document_number_hash: hashDocumentNumber(demoUser.documentNumber),
          first_name: demoUser.firstName,
          last_name: demoUser.lastName,
          full_name: `${demoUser.firstName} ${demoUser.lastName}`,
          nationality: demoUser.nationality,
          issuing_state: demoUser.issuingState,
          date_of_birth: dateOfBirth,
          date_of_expiry: dateOfExpiry,
          verified_profile_photo_base64: demoUser.photoDataUri,
          avatar_photo_base64: buildInitialsAvatar(
            `${demoUser.firstName} ${demoUser.lastName}`,
          ),
          profile_photo_base64: demoUser.photoDataUri,
          bio: demoUser.bio,
          show_photo_to_others: true,
          show_age_to_others: true,
          home_address_label: demoUser.homeAddressLabel,
          home_neighborhood: canonicalNeighborhood,
          verification_state: "verified",
          document_checked_at: now,
          last_seen_at: now,
        },
        $setOnInsert: {
          _id: demoUser.documentNumber,
          account_status: "active",
          verified_at: now,
          verification_locked_at: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!savedUser) {
      throw new HttpError(500, "Failed to save demo user");
    }

    await communitiesService.ensureNeighborhoodGroupsForUser(
      demoUser.documentNumber,
      canonicalNeighborhood,
    );

    const authToken = createAuthToken(demoUser.documentNumber);

    return {
      userId: demoUser.documentNumber,
      token: authToken.token,
      tokenType: "Bearer",
      expiresAt: authToken.expiresAt,
      profile: buildFixedProfile(savedUser),
    };
  },

  async loginWithNfc(payload: NfcLoginPayload): Promise<NfcLoginResponse> {
    const challengeId = String(payload.challengeId ?? "").trim();
    if (!challengeId) {
      throw new HttpError(400, "challengeId is required");
    }

    if (!payload.evidence) {
      throw new HttpError(400, "evidence is required");
    }

    const challengeBase64 = nfcVerifier.consumeChallenge(challengeId);
    const verified = await nfcVerifier.verifyEvidence({
      challengeBase64,
      evidence: payload.evidence,
    });

    const documentNumber = verified.documentNumber.trim().toUpperCase();
    const firstName = normalizeName(verified.firstName);
    const lastName = normalizeName(verified.lastName);
    const nationality = verified.nationality.trim().toUpperCase();
    const issuingState = verified.issuingState?.trim().toUpperCase() || undefined;
    const dateOfBirth = parseMrzDate(verified.dateOfBirth, "dateOfBirth");
    const dateOfExpiry = parseMrzDate(verified.dateOfExpiry, "dateOfExpiry");
    if (dateOfExpiry.getTime() < Date.now()) {
      throw new HttpError(400, "Document is expired");
    }

    const now = new Date();
    const fullName = `${firstName} ${lastName}`.trim();
    const documentNumberHash = hashDocumentNumber(documentNumber);
    const documentNumberEncoded = encodeDocumentNumber(documentNumber);
    const verifiedPhotoBase64 = verified.photoBase64?.trim() || undefined;
    const avatarPhotoBase64 = buildInitialsAvatar(fullName);
    const duplicateWithDifferentId = await User.findOne({
      document_number: documentNumber,
      _id: { $ne: documentNumber },
    })
      .select("_id")
      .lean();

    if (duplicateWithDifferentId) {
      throw new HttpError(
        409,
        `Duplicate user exists for document_number ${documentNumber}. Clean old rows before retrying.`,
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
        throw new HttpError(
          409,
          "Stored document identity does not match the NFC read",
        );
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
          verified_profile_photo_base64: verifiedPhotoBase64,
          avatar_photo_base64: avatarPhotoBase64,
          profile_photo_base64: verifiedPhotoBase64 || avatarPhotoBase64,
          show_photo_to_others: true,
          show_age_to_others: true,
          verification_state: "verified",
          document_checked_at: now,
          last_seen_at: now,
        },
        $setOnInsert: {
          _id: documentNumber,
          account_status: "active",
          verified_at: now,
          verification_locked_at: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!savedUser) {
      throw new HttpError(500, "Failed to save NFC login user");
    }

    const authToken = createAuthToken(documentNumber);

    return {
      userId: documentNumber,
      token: authToken.token,
      tokenType: "Bearer",
      expiresAt: authToken.expiresAt,
      profile: buildFixedProfile(savedUser),
    };
  },

  async getFixedProfile(
    documentNumber: string,
  ): Promise<FixedProfileResponse | null> {
    const user = await User.findOne({
      document_number: documentNumber.trim().toUpperCase(),
    })
      .select(
        "document_number first_name last_name full_name nationality issuing_state date_of_birth date_of_expiry verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 bio show_photo_to_others show_age_to_others home_address_label home_neighborhood",
      )
      .lean();

    if (!user) {
      return null;
    }

    return buildFixedProfile(user);
  },

  async getPublicProfile(
    userId: string,
    viewerUserId?: string,
  ): Promise<PublicProfileResponse | null> {
    const user = await User.findById(userId)
      .select(
        "full_name verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 bio date_of_birth home_neighborhood last_seen_at show_photo_to_others show_age_to_others",
      )
      .lean();

    if (!user) {
      return null;
    }

    const relationship = viewerUserId
      ? await getRelationshipStatus(viewerUserId, userId)
      : "none";
    const canSeePrivateFields = relationship === "self";

    return {
      userId,
      fullName: user.full_name || userId,
      photoBase64: resolveVisibleProfilePhoto({
        fullName: user.full_name,
        profilePhotoBase64:
          user.verified_profile_photo_base64 ||
          (user.profile_photo_base64 &&
          !isGeneratedAvatarDataUri(user.profile_photo_base64)
            ? user.profile_photo_base64
            : undefined) ||
          user.avatar_photo_base64,
        showPhotoToOthers: user.show_photo_to_others,
        canSeePrivatePhoto: canSeePrivateFields,
        fallbackLabel: userId,
      }),
      bio: user.bio,
      age:
        canSeePrivateFields || user.show_age_to_others
          ? getAge(user.date_of_birth)
          : undefined,
      neighborhood: user.home_neighborhood ?? null,
      lastSeenAt: user.last_seen_at?.toISOString(),
    };
  },
  async upsertLocations(userId: string, payload: LocationPayload) {
    const user = await User.findById(userId)
      .select("_id verification_state")
      .lean();

    if (!user) {
      throw new HttpError(404, "User not found");
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
        is_active: true,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
  },

  async saveHomeAddress(
    userId: string,
    payload: AddressOnboardingPayload,
  ): Promise<AddressOnboardingResponse> {
    const addressLabel = payload.addressLabel.trim();
    const neighborhood = payload.neighborhood?.trim() || "";
    if (!addressLabel) {
      throw new HttpError(400, "addressLabel is required");
    }

    let resolvedNeighborhoodFromPoint: string | null = null;

    const user = await User.findById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    if (payload.location) {
      if (
        payload.location.type !== "Point" ||
        !Array.isArray(payload.location.coordinates) ||
        payload.location.coordinates.length !== 2
      ) {
        throw new HttpError(
          400,
          "location must be a GeoJSON Point when provided",
        );
      }

      const resolverResult = await resolveNeighborhood(payload.location);
      resolvedNeighborhoodFromPoint = resolverResult.neighborhood;
      await UserLocation.findOneAndUpdate(
        { user_id: user._id },
        {
          user_id: user._id,
          home_location_point: payload.location,
          home_location_label: addressLabel,
          home_input_source: "maps_place_input",
          is_active: true,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      ).lean();
    }

    const effectiveNeighborhood = neighborhood || resolvedNeighborhoodFromPoint;
    if (!effectiveNeighborhood) {
      throw new HttpError(400, "neighborhood is required");
    }

    const canonicalNeighborhood =
      await neighborhoodsService.getCanonicalNeighborhoodName(
        effectiveNeighborhood,
      );

    user.home_address_label = addressLabel;
    user.home_neighborhood = canonicalNeighborhood;
    await user.save();
    await communitiesService.ensureNeighborhoodGroupsForUser(
      userId,
      canonicalNeighborhood,
    );

    return {
      userId: user._id,
      addressLabel,
      neighborhood: user.home_neighborhood ?? canonicalNeighborhood,
      neighborhoodResolutionMode: neighborhood
        ? "manual_selection"
        : "coordinate_resolution",
    };
  },

  async saveBio(userId: string, bio: string): Promise<FixedProfileResponse> {
    const normalizedBio = bio.trim();
    const user = await User.findById(userId);

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    user.bio = normalizedBio.slice(0, 280);
    await user.save();

    return buildFixedProfile(user);
  },

  async savePrivacySettings(
    userId: string,
    payload: { showPhotoToOthers: boolean; showAgeToOthers: boolean },
  ): Promise<FixedProfileResponse> {
    const user = await User.findById(userId);

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    user.show_photo_to_others = payload.showPhotoToOthers;
    user.show_age_to_others = payload.showAgeToOthers;
    await user.save();

    return buildFixedProfile(user);
  },
};
