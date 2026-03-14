import { NativeModules, Platform } from 'react-native';

type NativePaceResult = {
  firstName: string;
  lastName: string;
  fullName: string;
  documentNumber?: string;
  issuingState?: string;
  nationality?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
  dg2?: {
    available: boolean;
    base64?: string;
  };
};

type NativeReaderModule = {
  readNameWithPace(can: string): Promise<NativePaceResult>;
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
};

const nativeReader = (NativeModules.CeiNativeReader ?? null) as NativeReaderModule | null;

export async function readIdentityCard(can: string): Promise<NfcIdentityPayload> {
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

  const result = await nativeReader.readNameWithPace(can.trim());

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
    photoBase64: result.dg2?.available ? result.dg2.base64 : undefined
  };
}
