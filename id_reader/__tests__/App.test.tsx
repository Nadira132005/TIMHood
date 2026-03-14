/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../../App';

jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockResolvedValue(true),
    start: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockResolvedValue(true),
    requestTechnology: jest.fn().mockResolvedValue(undefined),
    getTag: jest.fn().mockResolvedValue(null),
    cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
  },
  NfcTech: {
    NfcA: 'android.nfc.tech.NfcA',
    NfcB: 'android.nfc.tech.NfcB',
    IsoDep: 'android.nfc.tech.IsoDep',
    MifareClassic: 'android.nfc.tech.MifareClassic',
    MifareUltralight: 'android.nfc.tech.MifareUltralight',
    Ndef: 'android.nfc.tech.Ndef',
  },
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
