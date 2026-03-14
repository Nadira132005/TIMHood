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
  documentIsValid: boolean;
};

export type SessionState = {
  userId: string | null;
  profile: FixedIdentityProfile | null;
};

export const initialSessionState: SessionState = {
  userId: null,
  profile: null
};
