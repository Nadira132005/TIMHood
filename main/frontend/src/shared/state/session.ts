export type FixedIdentityProfile = {
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

export type AuthSession = {
  token: string;
  expiresAt?: string | null;
};

export type SessionState = {
  userId: string | null;
  auth: AuthSession | null;
  profile: FixedIdentityProfile | null;
};

export const initialSessionState: SessionState = {
  userId: null,
  auth: null,
  profile: null
};
