import { NativeModules, Platform } from 'react-native';

type NativeRawLdsFile = {
  byteLength: number;
  base64: string;
  sha256: string;
};

type NativeOptionalRawLdsFile = NativeRawLdsFile | undefined;

type NativeDataGroupResult = {
  available: boolean;
  raw?: NativeRawLdsFile;
  error?: string;
};

type NativeSodResult = {
  available: boolean;
  raw?: NativeRawLdsFile;
  digestAlgorithm?: string;
  signerDigestAlgorithm?: string;
  digestEncryptionAlgorithm?: string;
  dataGroupHashes?: Record<string, string>;
  documentSigningCertificate?: string;
  error?: string;
};

type NativeActiveAuthenticationResult = {
  supported: boolean;
  performed: boolean;
  verifiedByChip?: boolean;
  status?: string;
  challenge?: string;
  response?: string;
  publicKey?: string;
  publicKeyAlgorithm?: string;
  digestAlgorithm?: string;
  signatureAlgorithm?: string;
  signatureAlgorithmOid?: string;
  signatureAlgorithmMnemonic?: string;
  error?: string;
};

type NativePaceResult = {
  firstName: string;
  lastName: string;
  fullName: string;
  documentNumber?: string;
  issuingState?: string;
  nationality?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
  dg1?: NativeRawLdsFile;
  dg2?: (NativeDataGroupResult & {
    base64?: string;
    byteLength?: number;
    mimeType?: string;
    width?: number;
    height?: number;
  });
  dg11?: NativeDataGroupResult;
  dg12?: NativeDataGroupResult;
  dg15?: NativeDataGroupResult & {
    publicKey?: string;
    publicKeyAlgorithm?: string;
    publicKeyFormat?: string;
  };
  sod?: NativeSodResult;
  activeAuthentication?: NativeActiveAuthenticationResult;
  timingsMs?: Record<string, number>;
};

type NativeReaderModule = {
  readNameWithPace(can: string): Promise<NativePaceResult>;
  readNameWithPaceAndActiveAuth?(can: string, challengeBase64: string): Promise<NativePaceResult>;
};

export type NfcReadEvidence = {
  dg1?: NativeRawLdsFile;
  dg2?: NativeOptionalRawLdsFile;
  dg11?: NativeOptionalRawLdsFile;
  dg12?: NativeOptionalRawLdsFile;
  dg15?: NativeRawLdsFile & {
    publicKey?: string;
    publicKeyAlgorithm?: string;
    publicKeyFormat?: string;
  };
  sod?: NativeSodResult;
  activeAuthentication?: NativeActiveAuthenticationResult;
  timingsMs?: Record<string, number>;
};

export type NfcIdentityPayload = {
  documentNumber: string;
  firstName: string;
  lastName: string;
  nationality: string;
  issuingState?: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  photoBase64?: string;
  evidence: NfcReadEvidence;
};

const nativeReader = (NativeModules.CeiNativeReader ?? null) as NativeReaderModule | null;

function toDg15Evidence(result: NativePaceResult): NfcReadEvidence['dg15'] {
  if (!result.dg15?.available || !result.dg15.raw) {
    return undefined;
  }

  return {
    ...result.dg15.raw,
    publicKey: result.dg15.publicKey,
    publicKeyAlgorithm: result.dg15.publicKeyAlgorithm,
    publicKeyFormat: result.dg15.publicKeyFormat,
  };
}

export async function readIdentityCard(
  can: string,
  activeAuthChallengeBase64?: string
): Promise<NfcIdentityPayload> {
  if (Platform.OS !== 'android') {
    throw new Error('NFC ID reading is currently supported only on Android.');
  }

  if (!/^\d{6}$/.test(can.trim())) {
    throw new Error('Enter the 6-digit CAN from the Romanian ID card.');
  }

  if (!nativeReader) {
    throw new Error(
      'The id_reader native module is not available in this build. Use a custom Android build that includes CeiNativeReader.'
    );
  }

  const result =
    activeAuthChallengeBase64 && nativeReader.readNameWithPaceAndActiveAuth
      ? await nativeReader.readNameWithPaceAndActiveAuth(can.trim(), activeAuthChallengeBase64)
      : await nativeReader.readNameWithPace(can.trim());

  if (!result.documentNumber || !result.nationality || !result.dateOfBirth || !result.dateOfExpiry) {
    throw new Error('The NFC read completed, but the identity payload is incomplete.');
  }

  return {
    documentNumber: result.documentNumber,
    firstName: result.firstName,
    lastName: result.lastName,
    nationality: result.nationality,
    issuingState: result.issuingState,
    dateOfBirth: result.dateOfBirth,
    dateOfExpiry: result.dateOfExpiry,
    photoBase64: result.dg2?.available ? result.dg2.base64 : undefined,
    evidence: {
      dg1: result.dg1,
      dg2: result.dg2?.available ? result.dg2.raw : undefined,
      dg11: result.dg11?.available ? result.dg11.raw : undefined,
      dg12: result.dg12?.available ? result.dg12.raw : undefined,
      dg15: toDg15Evidence(result),
      sod: result.sod,
      activeAuthentication: result.activeAuthentication,
      timingsMs: result.timingsMs,
    },
  };
}
