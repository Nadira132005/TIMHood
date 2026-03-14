import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NfcManager, { NfcTech, type NfcTag } from 'react-native-nfc-manager';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

type Analysis = {
  headline: string;
  summary: string;
  details: string[];
};

type AccessCredentials = {
  can: string;
  authPin: string;
};

type ApduResult = {
  label: string;
  commandHex: string;
  responseHex: string;
  sw: string;
  ok: boolean;
};

type CardAccessSummary = {
  rawHex: string;
  oidLabels: string[];
  tlvLabels: string[];
  paceLikely: boolean;
};

type DirSummary = {
  records: string[];
  aidLabels: string[];
};

type Pkcs15Summary = {
  steps: string[];
};

type CivPivSummary = {
  steps: string[];
  nameHints: string[];
};

type AidSweepSummary = {
  steps: string[];
  matchedAids: string[];
};

type SecureMessagingSummary = {
  steps: string[];
  nonceHex?: string;
};

type NativePaceSummary = {
  fullName: string;
  firstName: string;
  lastName: string;
  documentNumber?: string;
  issuingState?: string;
  nationality?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
};

type NativePaceModule = {
  readNameWithPace(can: string): Promise<NativePaceSummary>;
};

const nativePaceModule = (NativeModules.CeiNativeReader ?? null) as NativePaceModule | null;

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#07111f" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [supportStatus, setSupportStatus] = useState(
    'Checking NFC availability on this device...',
  );
  const [busy, setBusy] = useState(false);
  const [lastTag, setLastTag] = useState<NfcTag | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [apduResults, setApduResults] = useState<ApduResult[]>([]);
  const [cardAccess, setCardAccess] = useState<CardAccessSummary | null>(null);
  const [dirSummary, setDirSummary] = useState<DirSummary | null>(null);
  const [pkcs15Summary, setPkcs15Summary] = useState<Pkcs15Summary | null>(null);
  const [civPivSummary, setCivPivSummary] = useState<CivPivSummary | null>(null);
  const [aidSweepSummary, setAidSweepSummary] = useState<AidSweepSummary | null>(null);
  const [secureMessagingSummary, setSecureMessagingSummary] =
    useState<SecureMessagingSummary | null>(null);
  const [nativePaceSummary, setNativePaceSummary] = useState<NativePaceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customApdu, setCustomApdu] = useState('00A4040C07A0000002471001');
  const [credentials, setCredentials] = useState<AccessCredentials>({
    can: '',
    authPin: '',
  });

  useEffect(() => {
    let mounted = true;

    async function prepareNfc() {
      if (Platform.OS !== 'android') {
        if (mounted) {
          setSupportStatus('This build is intended for Android NFC scanning.');
        }
        return;
      }

      try {
        const isSupported = await NfcManager.isSupported();
        if (!isSupported) {
          if (mounted) {
            setSupportStatus('This Android device does not support NFC.');
          }
          return;
        }

        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();

        if (mounted) {
          setSupportStatus(
            enabled
              ? 'NFC is ready. Tap Scan and hold the Romanian ID card to the phone.'
              : 'NFC is supported, but turned off in Android settings.',
          );
        }
      } catch (nfcError) {
        if (mounted) {
          setSupportStatus('Unable to initialize NFC on this device.');
          setError(getErrorMessage(nfcError));
        }
      }
    }

    prepareNfc();

    return () => {
      mounted = false;
      cancelTechnologyRequest();
    };
  }, []);

  async function handleScan() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setApduResults([]);
    setCardAccess(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);
    setAidSweepSummary(null);
    setSecureMessagingSummary(null);
    setNativePaceSummary(null);
    setSecureMessagingSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const probeResults = await runCeiProbe();
      setLastTag(tag);
      setApduResults(probeResults);
      setAnalysis(analyzeTag(tag, credentials, probeResults));
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleSendCustomApdu() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    if (!isValidApduHex(customApdu)) {
      setError('Enter an APDU as an even-length hex string, for example 00A4040C07A0000002471001.');
      return;
    }

    setBusy(true);
    setError(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);
    setAidSweepSummary(null);
    setSecureMessagingSummary(null);
    setNativePaceSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const commandBytes = hexToBytes(customApdu);
      const response = await NfcManager.isoDepHandler.transceive(commandBytes);
      const result = toApduResult('Custom APDU', commandBytes, response);
      const nextResults = [...apduResults, result];

      setLastTag(tag);
      setApduResults(nextResults);
      setAnalysis(analyzeTag(tag, credentials, nextResults));
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleReadCardAccess() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);
    setAidSweepSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const results = [...apduResults];
      const selectIcao = await sendApdu('SELECT ICAO applet', [
        0x00, 0xa4, 0x04, 0x0c, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01,
      ]);
      results.push(selectIcao);

      if (!selectIcao.ok) {
        throw new Error(`ICAO applet select failed with SW ${selectIcao.sw}.`);
      }

      const selectMf = await sendApdu('SELECT MF', [
        0x00, 0xa4, 0x00, 0x0c, 0x02, 0x3f, 0x00,
      ]);
      results.push(selectMf);

      if (!selectMf.ok) {
        throw new Error(`MF select failed with SW ${selectMf.sw}.`);
      }

      const selectCardAccess = await sendApdu('SELECT EF.CardAccess', [
        0x00, 0xa4, 0x00, 0x0c, 0x02, 0x01, 0x1c,
      ]);
      results.push(selectCardAccess);

      if (!selectCardAccess.ok) {
        throw new Error(`EF.CardAccess select failed with SW ${selectCardAccess.sw}.`);
      }

      const cardAccessBytes = await readCardAccessFile();
      const summary = summarizeCardAccess(cardAccessBytes);
      const fileRead = {
        label: 'READ EF.CardAccess',
        commandHex: '00B0....',
        responseHex: summary.rawHex,
        sw: '9000',
        ok: true,
      };
      const nextResults = [...results, fileRead];

      setLastTag(tag);
      setApduResults(nextResults);
      setCardAccess(summary);
      setAnalysis(analyzeTag(tag, credentials, nextResults, summary));
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleInspectChip() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setCardAccess(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);
    setSecureMessagingSummary(null);
    setAidSweepSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const transcript: ApduResult[] = [];
      const baseCommands: Array<{ label: string; bytes: number[] }> = [
        {
          label: 'SELECT ICAO applet',
          bytes: [0x00, 0xa4, 0x04, 0x0c, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01],
        },
        {
          label: 'SELECT MF',
          bytes: [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x3f, 0x00],
        },
        {
          label: 'SELECT EF.CardAccess',
          bytes: [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x01, 0x1c],
        },
      ];

      for (const command of baseCommands) {
        const result = await sendApdu(command.label, command.bytes);
        transcript.push(result);
      }

      const cardAccessRead = await sendApdu('READ EF.CardAccess [SFI 1, 16 bytes]', [
        0x00, 0xb0, 0x81, 0x00, 0x10,
      ]);
      transcript.push(cardAccessRead);

      const standardProbes: Array<{ label: string; bytes: number[] }> = [
        {
          label: 'SELECT EF.COM',
          bytes: [0x00, 0xa4, 0x02, 0x0c, 0x02, 0x01, 0x1e],
        },
        {
          label: 'READ EF.COM [offset]',
          bytes: [0x00, 0xb0, 0x00, 0x00, 0x20],
        },
        {
          label: 'READ EF.COM [SFI 2]',
          bytes: [0x00, 0xb0, 0x82, 0x00, 0x20],
        },
        {
          label: 'SELECT DG1',
          bytes: [0x00, 0xa4, 0x02, 0x0c, 0x02, 0x01, 0x01],
        },
        {
          label: 'READ DG1 [offset]',
          bytes: [0x00, 0xb0, 0x00, 0x00, 0x20],
        },
        {
          label: 'READ DG1 [SFI 1]',
          bytes: [0x00, 0xb0, 0x81, 0x00, 0x20],
        },
      ];

      for (const command of standardProbes) {
        const result = await sendApdu(command.label, command.bytes);
        transcript.push(result);
      }

      const cardAccessData = cardAccessRead.ok
        ? hexToBytes(cardAccessRead.responseHex.slice(0, -4))
        : [];
      const summary = cardAccessData.length > 0 ? summarizeCardAccess(cardAccessData) : null;

      setLastTag(tag);
      setApduResults(transcript);
      setCardAccess(summary);
      setAnalysis(analyzeTag(tag, credentials, transcript, summary));
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleDiscoverApplets() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setCardAccess(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);
    setAidSweepSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const transcript: ApduResult[] = [];
      const selectMf = await sendApdu('SELECT MF', [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x3f, 0x00]);
      transcript.push(selectMf);

      if (!selectMf.ok) {
        throw new Error(`MF select failed with SW ${selectMf.sw}.`);
      }

      const selectEfDir = await sendApdu('SELECT EF.DIR', [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x2f, 0x00]);
      transcript.push(selectEfDir);

      if (!selectEfDir.ok) {
        throw new Error(`EF.DIR select failed with SW ${selectEfDir.sw}.`);
      }

      const records: string[] = [];
      for (let record = 1; record <= 8; record += 1) {
        const result = await sendApdu(`READ RECORD ${record}`, [0x00, 0xb2, record, 0x04, 0x00]);
        transcript.push(result);

        if (!result.ok) {
          if (result.sw === '6A83' || result.sw === '6A82') {
            break;
          }
          continue;
        }

        const recordHex = stripStatusWord(result.responseHex);
        if (recordHex.length > 0) {
          records.push(recordHex);
        }
      }

      const summary = summarizeDir(records);

      setLastTag(tag);
      setApduResults(transcript);
      setDirSummary(summary);
      setAnalysis({
        headline: summary.aidLabels.length > 0
          ? 'Applet discovery succeeded'
          : 'Applet discovery did not reveal AIDs yet',
        summary:
          'This step reads EF.DIR to discover application identifiers on the card. Finding the PKI-related AID is the cleanest route toward certificate and name retrieval over NFC.',
        details: [
          `Records read: ${summary.records.length}`,
          summary.aidLabels.length > 0
            ? `AIDs found: ${summary.aidLabels.length}`
            : 'No AIDs were extracted from the returned EF.DIR records.',
        ],
      });
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleTryUserCertificatePath() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setCardAccess(null);
    setDirSummary(null);
    setCivPivSummary(null);
    setAidSweepSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const transcript: ApduResult[] = [];
      const steps: string[] = [];
      const commands: Array<{ label: string; bytes: number[] }> = [
        {
          label: 'SELECT PKCS#15 AID',
          bytes: [0x00, 0xa4, 0x04, 0x0c, 0x0b, 0xa0, 0x00, 0x00, 0x00, 0x63, 0x50, 0x4b, 0x43, 0x53, 0x2d, 0x31, 0x35],
        },
        {
          label: 'SELECT ODF',
          bytes: [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x50, 0x31],
        },
        {
          label: 'READ ODF',
          bytes: [0x00, 0xb0, 0x00, 0x00, 0x40],
        },
        {
          label: 'SELECT CDF',
          bytes: [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x50, 0x34],
        },
        {
          label: 'READ CDF',
          bytes: [0x00, 0xb0, 0x00, 0x00, 0x40],
        },
      ];

      for (const command of commands) {
        const result = await sendApdu(command.label, command.bytes);
        transcript.push(result);
        steps.push(`${command.label}: SW ${result.sw}`);
      }

      setLastTag(tag);
      setApduResults(transcript);
      setPkcs15Summary({ steps });
      setAnalysis({
        headline: 'User certificate path probe completed',
        summary:
          'This probe tries a PKCS#15-style user PKI path because the desktop middleware exposes a user-PIN PKI application with certificates and keys.',
        details: steps,
      });
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleTryCivPivFlow() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setCardAccess(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setAidSweepSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const transcript: ApduResult[] = [];
      const steps: string[] = [];

      const baseCommands: Array<{ label: string; bytes: number[] }> = [
        {
          label: 'SELECT ICAO applet',
          bytes: [0x00, 0xa4, 0x04, 0x0c, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01],
        },
        {
          label: 'SELECT MF',
          bytes: [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x3f, 0x00],
        },
      ];

      for (const command of baseCommands) {
        const result = await sendApdu(command.label, command.bytes);
        transcript.push(result);
        steps.push(`${command.label}: SW ${result.sw}`);
      }

      const civCandidates: Array<{ label: string; bytes: number[] }> = [
        {
          label: 'SELECT PIV AID',
          bytes: [0x00, 0xa4, 0x04, 0x0c, 0x09, 0xa0, 0x00, 0x00, 0x03, 0x08, 0x00, 0x00, 0x10, 0x00],
        },
        {
          label: 'GET DATA discovery tag 5FC107',
          bytes: [0x00, 0xcb, 0x3f, 0xff, 0x05, 0x5c, 0x03, 0x5f, 0xc1, 0x07, 0x00],
        },
        {
          label: 'GET DATA discovery tag 5FC102',
          bytes: [0x00, 0xcb, 0x3f, 0xff, 0x05, 0x5c, 0x03, 0x5f, 0xc1, 0x02, 0x00],
        },
        {
          label: 'GENERAL AUTHENTICATE bootstrap',
          bytes: [0x00, 0x87, 0x03, 0x9b, 0x04, 0x7c, 0x02, 0x81, 0x00, 0x00],
        },
      ];

      for (const command of civCandidates) {
        const result = await sendApdu(command.label, command.bytes);
        transcript.push(result);
        steps.push(`${command.label}: SW ${result.sw}`);
      }

      const pinBytes = credentials.authPin ? encodeAscii(credentials.authPin) : [];
      if (pinBytes.length > 0) {
        const verifyPin = await sendApdu('VERIFY PIN (ASCII)', [
          0x00,
          0x20,
          0x00,
          0x80,
          pinBytes.length,
          ...pinBytes,
        ]);
        transcript.push(verifyPin);
        steps.push(`VERIFY PIN (ASCII): SW ${verifyPin.sw}`);
      } else {
        steps.push('VERIFY PIN skipped because no 4-digit PIN was entered.');
      }

      const afterLoginCandidates: Array<{ label: string; bytes: number[] }> = [
        {
          label: 'GET DATA cert tag 5FC105',
          bytes: [0x00, 0xcb, 0x3f, 0xff, 0x05, 0x5c, 0x03, 0x5f, 0xc1, 0x05, 0x00],
        },
        {
          label: 'GET DATA cert tag 5FC10A',
          bytes: [0x00, 0xcb, 0x3f, 0xff, 0x05, 0x5c, 0x03, 0x5f, 0xc1, 0x0a, 0x00],
        },
      ];

      for (const command of afterLoginCandidates) {
        const result = await sendApdu(command.label, command.bytes);
        transcript.push(result);
        steps.push(`${command.label}: SW ${result.sw}`);
      }

      const nameHints = transcript.flatMap(result => extractNameHints(stripStatusWord(result.responseHex)));

      setLastTag(tag);
      setApduResults(transcript);
      setCivPivSummary({ steps, nameHints });
      setAnalysis({
        headline: 'CIV/PIV flow probe completed',
        summary:
          'This probe follows the higher-level middleware model we found in the Linux CIV library: select app, attempt secure/auth steps, then query likely certificate containers.',
        details: nameHints.length > 0
          ? [`Readable name-like text found: ${nameHints.join(', ')}`, ...steps]
          : steps,
      });
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleAidSweep() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setCardAccess(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const transcript: ApduResult[] = [];
      const steps: string[] = [];
      const matchedAids: string[] = [];

      const candidates = [
        { label: 'ICAO LDS AID', aidHex: 'A0000002471001' },
        { label: 'PIV AID', aidHex: 'A00000030800001000' },
        { label: 'PKCS#15 AID', aidHex: 'A000000063504B43532D3135' },
        { label: 'Gemalto PKI AID', aidHex: 'A000000018434D00' },
        { label: 'Belgian eID AID', aidHex: 'A000000177504B43532D3135' },
        { label: 'Romanian CEI hypothesis AID 1', aidHex: 'A0000002472001' },
        { label: 'Romanian CEI hypothesis AID 2', aidHex: 'A0000002472002' },
        { label: 'Romanian CEI hypothesis AID 3', aidHex: 'A0000002473001' },
      ];

      for (const candidate of candidates) {
        const aidBytes = hexToBytes(candidate.aidHex);
        const command = [0x00, 0xa4, 0x04, 0x0c, aidBytes.length, ...aidBytes];
        const result = await sendApdu(`SELECT ${candidate.label}`, command);
        transcript.push(result);
        steps.push(`${candidate.label} (${candidate.aidHex}): SW ${result.sw}`);

        if (result.ok) {
          matchedAids.push(`${candidate.label} (${candidate.aidHex})`);
        }
      }

      setLastTag(tag);
      setApduResults(transcript);
      setAidSweepSummary({ steps, matchedAids });
      setAnalysis({
        headline:
          matchedAids.length > 0
            ? 'AID sweep found selectable applications'
            : 'AID sweep did not reveal a new selectable application',
        summary:
          'This checks a short list of likely applet identifiers so we can stop guessing blindly and focus only on applets the card actually accepts.',
        details:
          matchedAids.length > 0
            ? [`Selectable AIDs: ${matchedAids.join(', ')}`, ...steps]
            : steps,
      });
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleTryObservedPace() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    setBusy(true);
    setError(null);
    setCardAccess(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);
    setAidSweepSummary(null);
    setSecureMessagingSummary(null);
    setNativePaceSummary(null);

    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag was returned by Android.');
      }

      const transcript: ApduResult[] = [];
      const steps: string[] = [];
      let nonceHex: string | undefined;
      const commands: Array<{ label: string; bytes: number[] }> = [
        {
          label: 'SELECT ICAO applet',
          bytes: [0x00, 0xa4, 0x04, 0x0c, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01],
        },
        {
          label: 'SELECT MF',
          bytes: [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x3f, 0x00],
        },
        {
          label: 'SELECT EF.CardAccess',
          bytes: [0x00, 0xa4, 0x02, 0x0c, 0x02, 0x01, 0x1c],
        },
        {
          label: 'READ EF.CardAccess chunk #1 from official log',
          bytes: [0x00, 0xb0, 0x00, 0x00, 0x08],
        },
        {
          label: 'READ EF.CardAccess chunk #2 from official log',
          bytes: [0x00, 0xb0, 0x00, 0x08, 0x7b],
        },
        {
          label: 'MSE:Set AT observed in official log',
          bytes: [
            0x00, 0x22, 0xc1, 0xa4, 0x0f, 0x80, 0x0a, 0x04, 0x00, 0x7f, 0x00, 0x07,
            0x02, 0x02, 0x04, 0x02, 0x04, 0x83, 0x01, 0x02,
          ],
        },
        {
          label: 'GENERAL AUTHENTICATE nonce request (live)',
          bytes: [0x10, 0x86, 0x00, 0x00, 0x02, 0x7c, 0x00, 0x00],
        },
        {
          label: 'GENERAL AUTHENTICATE nonce-map from official log',
          bytes: [
            0x00, 0x86, 0x00, 0x00, 0x0c, 0x7c, 0x0a, 0x85, 0x08, 0x64, 0x5d, 0x26,
            0xaf, 0x84, 0x5c, 0x13, 0xc4, 0x00,
          ],
        },
        {
          label: 'GENERAL AUTHENTICATE terminal key #1 from official log',
          bytes: [
            0x10, 0x86, 0x00, 0x00, 0x45, 0x7c, 0x43, 0x81, 0x41, 0x04, 0x79, 0x01,
            0x25, 0x61, 0x4c, 0x55, 0x55, 0x2e, 0xc8, 0xae, 0x15, 0x65, 0xf5, 0x8f,
            0xe0, 0xfd, 0x17, 0xbe, 0x30, 0x49, 0xbb, 0x5a, 0x75, 0x24, 0xe3, 0x04,
            0x2d, 0x27, 0x07, 0xba, 0x96, 0xc7, 0x13, 0xa1, 0x47, 0x4b, 0x88, 0x64,
            0xad, 0x4d, 0x05, 0xea, 0x58, 0x1b, 0x9c, 0x8e, 0xc1, 0x9d, 0xa7, 0xf5,
            0x82, 0xc8, 0xf0, 0xae, 0x6f, 0x9a, 0xce, 0x0f, 0xd2, 0x03, 0x73, 0x65,
            0x23, 0xec, 0x00,
          ],
        },
        {
          label: 'GENERAL AUTHENTICATE terminal key #2 from official log',
          bytes: [
            0x10, 0x86, 0x00, 0x00, 0x45, 0x7c, 0x43, 0x83, 0x41, 0x04, 0x1f, 0xd3,
            0x35, 0x92, 0xfe, 0x77, 0x56, 0x43, 0x71, 0x57, 0xbd, 0x32, 0xc4, 0x12,
            0xce, 0x22, 0x0f, 0xe9, 0xe1, 0xf2, 0x8b, 0xa1, 0x5a, 0xef, 0x39, 0x80,
            0x78, 0xdd, 0x61, 0x81, 0xc0, 0xa9, 0x09, 0xf5, 0x02, 0x8d, 0xda, 0x9a,
            0x9c, 0xba, 0x56, 0x7c, 0x7f, 0xad, 0xd0, 0x94, 0xf6, 0x3c, 0x59, 0xdb,
            0x33, 0x33, 0xe8, 0xa8, 0x0a, 0x96, 0xba, 0xbd, 0x77, 0x6d, 0xa2, 0x77,
            0x2f, 0x71, 0x00,
          ],
        },
        {
          label: 'Protected VERIFY / auth step from official log',
          bytes: [
            0x0c, 0x20, 0x00, 0x03, 0x1d, 0x87, 0x11, 0x01, 0xc1, 0xff, 0x49, 0xd2,
            0x78, 0x56, 0xc6, 0xf0, 0xc1, 0x32, 0xb3, 0x07, 0x15, 0xf7, 0x6f, 0xba,
            0x8e, 0x08, 0x3f, 0xc9, 0xd3, 0xd7, 0x3f, 0xe1, 0x34, 0xb9, 0x00,
          ],
        },
        {
          label: 'Protected SELECT app/file from official log',
          bytes: [
            0x0c, 0xa4, 0x04, 0x0c, 0x20, 0x87, 0x11, 0x01, 0x97, 0xdf, 0x7e, 0xeb,
            0x56, 0xc8, 0x77, 0xa8, 0x99, 0xeb, 0x21, 0xb5, 0x56, 0xfd, 0xc9, 0xaa,
            0x97, 0x01, 0x00, 0x8e, 0x08, 0xcb, 0x57, 0x3a, 0x43, 0x1b, 0x83, 0x04,
            0x85, 0x00,
          ],
        },
        {
          label: 'Protected SELECT file #1 from official log',
          bytes: [
            0x0c, 0xa4, 0x02, 0x0c, 0x1d, 0x87, 0x11, 0x01, 0xcf, 0xa9, 0x41, 0x90,
            0x0f, 0xdc, 0x59, 0xbd, 0xe7, 0x32, 0x9c, 0xd2, 0x62, 0x73, 0xec, 0xf4,
            0x8e, 0x08, 0xc4, 0xaa, 0xe2, 0xf3, 0x62, 0x39, 0xdd, 0xcb, 0x00,
          ],
        },
        {
          label: 'Protected READ from official log',
          bytes: [
            0x0c, 0xb0, 0x82, 0x00, 0x0d, 0x97, 0x01, 0x08, 0x8e, 0x08, 0x1f, 0xc0,
            0x20, 0x90, 0x1f, 0x1b, 0xc0, 0x0a, 0x00,
          ],
        },
      ];

      for (const command of commands) {
        const result = await sendApdu(command.label, command.bytes);
        transcript.push(result);
        steps.push(`${command.label}: SW ${result.sw}`);

        if (command.label === 'GENERAL AUTHENTICATE nonce request (live)' && result.ok) {
          const value = extractPaceNonce(stripStatusWord(result.responseHex));
          if (value) {
            nonceHex = value;
            steps.push(`Live PACE nonce candidate: ${value}`);
          }
        }
      }

      setLastTag(tag);
      setApduResults(transcript);
      setSecureMessagingSummary({ steps, nonceHex });
      setAnalysis({
        headline: 'Observed PACE bootstrap replay completed',
        summary:
          'This replays the official app sequence around CardAccess, PACE setup, and the first protected commands. Dynamic values are session-specific, so the SW pattern matters more than exact data.',
        details: nonceHex ? [`Live PACE nonce candidate: ${nonceHex}`, ...steps] : steps,
      });
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setBusy(false);
      cancelTechnologyRequest();
    }
  }

  async function handleNativePaceRead() {
    if (!isValidCan(credentials.can)) {
      setError('Enter the 6-digit CAN printed on the front of the Romanian CEI.');
      return;
    }

    if (!nativePaceModule || Platform.OS !== 'android') {
      setError('The native Android PACE module is not available in this build.');
      return;
    }

    setBusy(true);
    setError(null);
    setApduResults([]);
    setCardAccess(null);
    setDirSummary(null);
    setPkcs15Summary(null);
    setCivPivSummary(null);
    setAidSweepSummary(null);
    setSecureMessagingSummary(null);
    setNativePaceSummary(null);

    try {
      const result = await nativePaceModule.readNameWithPace(credentials.can);
      setNativePaceSummary(result);
      setAnalysis({
        headline: 'Native PACE read completed',
        summary:
          'The Android native reader attempted JMRTD-style PACE with the CAN and then tried to read DG1 for holder identity data.',
        details: [
          `Full name: ${result.fullName || 'not exposed'}`,
          result.documentNumber ? `Document number: ${result.documentNumber}` : 'Document number not exposed.',
          result.issuingState ? `Issuing state: ${result.issuingState}` : 'Issuing state not exposed.',
          result.nationality ? `Nationality: ${result.nationality}` : 'Nationality not exposed.',
          result.dateOfBirth ? `Date of birth: ${result.dateOfBirth}` : 'Date of birth not exposed.',
          result.dateOfExpiry ? `Date of expiry: ${result.dateOfExpiry}` : 'Date of expiry not exposed.',
        ],
      });
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.screen,
        {
          paddingTop: safeAreaInsets.top + 16,
          paddingBottom: safeAreaInsets.bottom + 16,
        },
      ]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Romanian CEI</Text>
          <Text style={styles.title}>Read Chip Access</Text>
          <Text style={styles.lead}>{supportStatus}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Access data</Text>
          <Text style={styles.cardText}>
            Enter the 6-digit CAN to start contactless reading. The 4-digit
            authentication PIN is separate and is usually needed for identity
            actions after the chip is accessed.
          </Text>

          <Text style={styles.inputLabel}>CAN</Text>
          <TextInput
            value={credentials.can}
            onChangeText={value =>
              setCredentials(current => ({
                ...current,
                can: value.replace(/\D/g, '').slice(0, 6),
              }))
            }
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6 digits"
            placeholderTextColor="#6f88a6"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Authentication PIN</Text>
          <TextInput
            value={credentials.authPin}
            onChangeText={value =>
              setCredentials(current => ({
                ...current,
                authPin: value.replace(/\D/g, '').slice(0, 4),
              }))
            }
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="4 digits"
            placeholderTextColor="#6f88a6"
            style={styles.input}
          />

          <Text style={styles.hint}>
            PIN entry is collected separately because CEI distinguishes chip
            access from authentication.
          </Text>
        </View>

        <Pressable
          disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
          onPress={handleScan}
          style={({ pressed }) => [
            styles.button,
            (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
          ]}>
          {busy ? (
            <ActivityIndicator color="#07111f" />
          ) : (
            <Text style={styles.buttonText}>Tap Card And Start NFC</Text>
          )}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>APDU console</Text>
          <Text style={styles.cardText}>
            Hold the CEI on the phone and send a raw APDU over the current
            `IsoDep` session.
          </Text>
          <Text style={styles.inputLabel}>APDU hex</Text>
          <TextInput
            value={customApdu}
            onChangeText={value => setCustomApdu(sanitizeHex(value))}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="00A4040C07A0000002471001"
            placeholderTextColor="#6f88a6"
            style={styles.input}
          />
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleSendCustomApdu}
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Send Custom APDU</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleReadCardAccess}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Read CardAccess</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleDiscoverApplets}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Discover Applets</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleTryUserCertificatePath}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Try User Cert Path</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleTryCivPivFlow}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Try CIV/PIV Flow</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleAidSweep}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Sweep AIDs</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleTryObservedPace}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Replay Observed PACE</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleNativePaceRead}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Native PACE Name</Text>
          </Pressable>
          <Pressable
            disabled={busy || Platform.OS !== 'android' || !isValidCan(credentials.can)}
            onPress={handleInspectChip}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.secondaryButtonAlt,
              (pressed || busy || !isValidCan(credentials.can)) && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Inspect Chip</Text>
          </Pressable>
        </View>

        {analysis ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{analysis.headline}</Text>
            <Text style={styles.cardText}>{analysis.summary}</Text>
            {analysis.details.map(detail => (
              <Text key={detail} style={styles.detail}>
                {`\u2022 ${detail}`}
              </Text>
            ))}
          </View>
        ) : null}

        {cardAccess ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CardAccess</Text>
            <Text style={styles.cardText}>
              This file advertises the chip security mechanisms. If PACE OIDs
              appear here, the next real step is implementing PACE with the CAN.
            </Text>
            <Text style={styles.detail}>
              {cardAccess.paceLikely
                ? 'PACE security info appears to be present.'
                : 'No known PACE OID was recognized in the raw CardAccess bytes.'}
            </Text>
            {cardAccess.tlvLabels.map(label => (
              <Text key={label} style={styles.detail}>
                {`\u2022 ${label}`}
              </Text>
            ))}
            {cardAccess.oidLabels.map(label => (
              <Text key={label} style={styles.detail}>
                {`\u2022 ${label}`}
              </Text>
            ))}
            <Text style={styles.raw}>{cardAccess.rawHex}</Text>
          </View>
        ) : null}

        {dirSummary ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EF.DIR</Text>
            <Text style={styles.cardText}>
              EF.DIR can reveal application identifiers present on the card. A
              PKI-related AID here would give us a concrete NFC target for
              certificate retrieval.
            </Text>
            {dirSummary.aidLabels.map(label => (
              <Text key={label} style={styles.detail}>
                {`\u2022 ${label}`}
              </Text>
            ))}
            {dirSummary.records.map(record => (
              <Text key={record} style={styles.raw}>
                {record}
              </Text>
            ))}
          </View>
        ) : null}

        {pkcs15Summary ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>User PKI Probe</Text>
            <Text style={styles.cardText}>
              This tries a PKCS#15-style certificate path that could explain the
              desktop user-PIN certificate view.
            </Text>
            {pkcs15Summary.steps.map(step => (
              <Text key={step} style={styles.detail}>
                {`\u2022 ${step}`}
              </Text>
            ))}
          </View>
        ) : null}

        {civPivSummary ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CIV/PIV Probe</Text>
            <Text style={styles.cardText}>
              This follows the Linux middleware shape more closely: connect,
              select an application, attempt authentication, and query likely
              certificate tags.
            </Text>
            {civPivSummary.nameHints.map(hint => (
              <Text key={hint} style={styles.detail}>
                {`\u2022 Name hint: ${hint}`}
              </Text>
            ))}
            {civPivSummary.steps.map(step => (
              <Text key={step} style={styles.detail}>
                {`\u2022 ${step}`}
              </Text>
            ))}
          </View>
        ) : null}

        {aidSweepSummary ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AID Sweep</Text>
            <Text style={styles.cardText}>
              This probes a short list of likely applet identifiers and reports
              only what the card actually accepts.
            </Text>
            {aidSweepSummary.matchedAids.map(match => (
              <Text key={match} style={styles.detail}>
                {`\u2022 Selectable: ${match}`}
              </Text>
            ))}
            {aidSweepSummary.steps.map(step => (
              <Text key={step} style={styles.detail}>
                {`\u2022 ${step}`}
              </Text>
            ))}
          </View>
        ) : null}

        {secureMessagingSummary ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Protected Read Probe</Text>
            <Text style={styles.cardText}>
              This replays the official app sequence around CardAccess, PACE,
              and the first protected commands. Dynamic values are tied to a
              live session, so the SW pattern matters more than exact data.
            </Text>
            {secureMessagingSummary.steps.map(step => (
              <Text key={step} style={styles.detail}>
                {`\u2022 ${step}`}
              </Text>
            ))}
          </View>
        ) : null}

        {nativePaceSummary ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Native PACE Result</Text>
            <Text style={styles.cardText}>
              This path runs a native Android PACE attempt and then tries to
              read DG1 through JMRTD-style APIs instead of replaying raw APDUs.
            </Text>
            <Text style={styles.detail}>{`\u2022 Full name: ${nativePaceSummary.fullName}`}</Text>
            <Text style={styles.detail}>{`\u2022 First name: ${nativePaceSummary.firstName}`}</Text>
            <Text style={styles.detail}>{`\u2022 Last name: ${nativePaceSummary.lastName}`}</Text>
            {nativePaceSummary.documentNumber ? (
              <Text style={styles.detail}>
                {`\u2022 Document number: ${nativePaceSummary.documentNumber}`}
              </Text>
            ) : null}
            {nativePaceSummary.issuingState ? (
              <Text style={styles.detail}>
                {`\u2022 Issuing state: ${nativePaceSummary.issuingState}`}
              </Text>
            ) : null}
            {nativePaceSummary.nationality ? (
              <Text style={styles.detail}>
                {`\u2022 Nationality: ${nativePaceSummary.nationality}`}
              </Text>
            ) : null}
            {nativePaceSummary.dateOfBirth ? (
              <Text style={styles.detail}>
                {`\u2022 Date of birth: ${nativePaceSummary.dateOfBirth}`}
              </Text>
            ) : null}
            {nativePaceSummary.dateOfExpiry ? (
              <Text style={styles.detail}>
                {`\u2022 Date of expiry: ${nativePaceSummary.dateOfExpiry}`}
              </Text>
            ) : null}
          </View>
        ) : null}

        {apduResults.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>APDU probe</Text>
            <Text style={styles.cardText}>
              These commands show the ordered APDU transcript against the chip.
            </Text>
            {apduResults.map(result => (
              <View key={`${result.label}-${result.commandHex}`} style={styles.apduRow}>
                <Text style={styles.detail}>{result.label}</Text>
                <Text style={styles.raw}>C: {result.commandHex}</Text>
                <Text style={styles.raw}>R: {result.responseHex}</Text>
                <Text style={[styles.detail, result.ok ? styles.okText : styles.failText]}>
                  SW: {result.sw}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {error ? (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>Scan issue</Text>
            <Text style={styles.warningText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current implementation status</Text>
          <Text style={styles.cardText}>
            This build now models the real CEI access flow: CAN for NFC reading
            and authentication PIN as a separate credential.
          </Text>
          <Text style={styles.cardText}>
            It now opens an `IsoDep` session and probes the chip with standard
            APDUs, but protected CEI reading still needs the Romanian secure
            access flow on top of this transport, plus data-group parsing.
          </Text>
        </View>

        {lastTag ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Raw tag data</Text>
            <Text style={styles.raw}>{JSON.stringify(lastTag, null, 2)}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function analyzeTag(
  tag: NfcTag,
  credentials: AccessCredentials,
  apduResults: ApduResult[],
  cardAccess?: CardAccessSummary | null,
): Analysis {
  const techTypes = normalizeTechTypes(tag.techTypes);
  const hasIsoDep = techTypes.includes('IsoDep');
  const hasNfcA = techTypes.includes('NfcA');
  const hasNfcB = techTypes.includes('NfcB');
  const successfulSelect = apduResults.some(result => result.label === 'SELECT ICAO applet' && result.ok);

  if (hasIsoDep && successfulSelect) {
    return {
      headline: 'Chip session opened successfully',
      summary:
        'The card exposed IsoDep and accepted the standard ICAO applet select APDU, which is a strong sign of a travel-document style secure chip.',
      details: [
        `Technologies: ${techTypes.join(', ') || 'unknown'}`,
        `Card UID: ${tag.id ?? 'not exposed by Android'}`,
        `CAN provided: ${maskDigits(credentials.can)}`,
        credentials.authPin
          ? `Authentication PIN captured: ${maskDigits(credentials.authPin)}`
          : 'Authentication PIN not entered yet.',
        hasNfcA
          ? 'The chip also answers as Type A.'
          : hasNfcB
            ? 'The chip also answers as Type B.'
            : 'The Type A/Type B modulation was not exposed in tag metadata.',
        cardAccess?.paceLikely
          ? 'CardAccess advertises PACE-related security info, so CAN-based chip access is likely the correct next step.'
          : 'CardAccess has not been read yet or did not expose a recognized PACE identifier.',
        'Protected CEI file reading still needs Romanian secure-access APDUs and file parsing.',
      ],
    };
  }

  if (hasIsoDep) {
    return {
      headline: 'IsoDep chip detected, applet access still uncertain',
      summary:
        'The phone opened an IsoDep session, but the standard ICAO applet probe did not complete successfully.',
      details: [
        `Technologies: ${techTypes.join(', ') || 'unknown'}`,
        `Card UID: ${tag.id ?? 'not exposed by Android'}`,
        `CAN provided: ${maskDigits(credentials.can)}`,
        credentials.authPin
          ? `Authentication PIN captured: ${maskDigits(credentials.authPin)}`
          : 'Authentication PIN not entered yet.',
        'This may mean the card uses a different applet selection path or needs protected access before useful reads.',
      ],
    };
  }

  return {
    headline: 'No secure document interface confirmed',
    summary:
      'The scan succeeded, but ISO-DEP was not exposed. This does not look like a typical electronic ID or passport chip from the available metadata.',
    details: [
      `Technologies: ${techTypes.join(', ') || 'unknown'}`,
      `Card UID: ${tag.id ?? 'not exposed by Android'}`,
      `CAN provided: ${maskDigits(credentials.can)}`,
      'A Romanian CEI would usually be expected to present as a secure IsoDep smartcard.',
    ],
  };
}

function isValidCan(can: string): boolean {
  return /^\d{6}$/.test(can);
}

function isValidApduHex(value: string): boolean {
  return value.length >= 8 && value.length % 2 === 0 && /^[0-9A-F]+$/.test(value);
}

async function runCeiProbe(): Promise<ApduResult[]> {
  const commands = [
    {
      label: 'SELECT ICAO applet',
      bytes: [0x00, 0xa4, 0x04, 0x0c, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01],
    },
    {
      label: 'SELECT MF',
      bytes: [0x00, 0xa4, 0x00, 0x0c, 0x02, 0x3f, 0x00],
    },
  ];

  const results: ApduResult[] = [];

  for (const command of commands) {
    results.push(await sendApdu(command.label, command.bytes));
  }

  return results;
}

async function sendApdu(label: string, bytes: number[]): Promise<ApduResult> {
  const response = await NfcManager.isoDepHandler.transceive(bytes);
  return toApduResult(label, bytes, response);
}

async function readCardAccessFile(): Promise<number[]> {
  const sfiBytes = await readBinaryFileBySfi(0x01);

  if (sfiBytes.length > 0) {
    return sfiBytes;
  }

  return readBinaryFileByOffset();
}

async function readBinaryFileBySfi(sfi: number): Promise<number[]> {
  const collected: number[] = [];
  let offset = 0;

  while (offset < 512) {
    const chunkSize = 0x10;
    const p1 = 0x80 + sfi;
    const response = await NfcManager.isoDepHandler.transceive([
      0x00,
      0xb0,
      p1,
      offset,
      chunkSize,
    ]);
    const sw = bytesToHex(response.slice(-2));

    if (sw !== '9000') {
      if (collected.length > 0 && (sw === '6282' || sw === '6B00' || sw === '6A86')) {
        break;
      }

      if (collected.length === 0 && (sw === '6986' || sw === '6A86')) {
        return [];
      }

      throw new Error(`SFI READ BINARY failed with SW ${sw} at offset ${offset}.`);
    }

    const data = response.slice(0, -2);
    collected.push(...data);

    if (data.length < chunkSize) {
      break;
    }

    offset += data.length;
  }

  return collected;
}

async function readBinaryFileByOffset(): Promise<number[]> {
  const collected: number[] = [];
  let offset = 0;

  while (offset < 512) {
    const chunkSize = 0x20;
    // APDU offset bytes are naturally expressed with bit operations.
    const response = await NfcManager.isoDepHandler.transceive([
      0x00,
      0xb0,
      // eslint-disable-next-line no-bitwise
      (offset >> 8) & 0xff,
      // eslint-disable-next-line no-bitwise
      offset & 0xff,
      chunkSize,
    ]);
    const sw = bytesToHex(response.slice(-2));

    if (sw !== '9000') {
      if (sw === '6282' || sw === '6B00') {
        break;
      }

      throw new Error(`READ BINARY failed with SW ${sw} at offset ${offset}.`);
    }

    const data = response.slice(0, -2);
    collected.push(...data);

    if (data.length < chunkSize) {
      break;
    }

    offset += data.length;
  }

  return collected;
}

function toApduResult(
  label: string,
  command: number[],
  response: number[],
): ApduResult {
  const statusBytes = response.slice(-2);
  const sw = bytesToHex(statusBytes);

  return {
    label,
    commandHex: bytesToHex(command),
    responseHex: bytesToHex(response),
    sw,
    ok: sw === '9000',
  };
}

function summarizeCardAccess(bytes: number[]): CardAccessSummary {
  const rawHex = bytesToHex(bytes);
  const oidHexes = extractOidHexes(bytes);
  const oidLabels = oidHexes.map(formatOidHex);
  const tlvLabels = parseSimpleTlv(bytes).map(
    item => `Tag ${item.tag} length ${item.length} value ${item.valueHex}`,
  );
  const paceLikely = oidLabels.some(label => label.includes('PACE'));

  return {
    rawHex,
    oidLabels,
    tlvLabels,
    paceLikely,
  };
}

function summarizeDir(records: string[]): DirSummary {
  const aidLabels = Array.from(new Set(records.flatMap(extractAidsFromRecord))).map(
    aid => `AID ${aid}`,
  );

  return {
    records,
    aidLabels,
  };
}

function extractPaceNonce(responseHex: string): string | null {
  const bytes = hexToBytes(responseHex);
  const tlvs = parseSimpleTlv(bytes);

  for (const item of tlvs) {
    if (item.tag === '7C') {
      const nested = parseSimpleTlv(hexToBytes(item.valueHex));
      const nonce = nested.find(candidate => candidate.tag === '80');
      if (nonce) {
        return nonce.valueHex;
      }
    }
  }

  const directNonce = tlvs.find(item => item.tag === '80');
  return directNonce ? directNonce.valueHex : null;
}

function extractAidsFromRecord(recordHex: string): string[] {
  const bytes = hexToBytes(recordHex);
  const aids: string[] = [];

  for (let index = 0; index < bytes.length - 1; index += 1) {
    if (bytes[index] !== 0x4f) {
      continue;
    }

    const length = bytes[index + 1];
    const start = index + 2;
    const end = start + length;
    if (end <= bytes.length) {
      aids.push(bytesToHex(bytes.slice(start, end)));
      index = end - 1;
    }
  }

  return aids;
}

function parseSimpleTlv(bytes: number[]): Array<{
  tag: string;
  length: number;
  valueHex: string;
}> {
  const items: Array<{ tag: string; length: number; valueHex: string }> = [];
  let index = 0;

  while (index < bytes.length) {
    const { tagBytes, nextIndex: afterTag } = readTag(bytes, index);
    if (afterTag >= bytes.length) {
      break;
    }

    const { length, nextIndex: afterLength } = readLength(bytes, afterTag);
    const end = afterLength + length;
    if (end > bytes.length) {
      break;
    }

    items.push({
      tag: bytesToHex(tagBytes),
      length,
      valueHex: bytesToHex(bytes.slice(afterLength, end)),
    });

    index = end;
  }

  return items;
}

function readTag(bytes: number[], start: number): {
  tagBytes: number[];
  nextIndex: number;
} {
  const tagBytes = [bytes[start]];
  let index = start + 1;

  // BER-TLV high-tag-number form is naturally bitwise.
  // eslint-disable-next-line no-bitwise
  if ((bytes[start] & 0x1f) === 0x1f) {
    while (index < bytes.length) {
      const current = bytes[index];
      tagBytes.push(current);
      index += 1;
      // eslint-disable-next-line no-bitwise
      if ((current & 0x80) === 0) {
        break;
      }
    }
  }

  return { tagBytes, nextIndex: index };
}

function readLength(bytes: number[], start: number): {
  length: number;
  nextIndex: number;
} {
  const first = bytes[start];

  // BER-TLV length parsing is naturally bitwise.
  // eslint-disable-next-line no-bitwise
  if ((first & 0x80) === 0) {
    return {
      length: first,
      nextIndex: start + 1,
    };
  }

  // eslint-disable-next-line no-bitwise
  const octetCount = first & 0x7f;
  let length = 0;
  let index = start + 1;

  for (let offset = 0; offset < octetCount && index < bytes.length; offset += 1) {
    length = length * 256 + bytes[index];
    index += 1;
  }

  return { length, nextIndex: index };
}

function extractOidHexes(bytes: number[]): string[] {
  const oids: string[] = [];

  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0x06 || index + 1 >= bytes.length) {
      continue;
    }

    const length = bytes[index + 1];
    const start = index + 2;
    const end = start + length;

    if (end <= bytes.length) {
      oids.push(bytesToHex(bytes.slice(start, end)));
      index = end - 1;
    }
  }

  return Array.from(new Set(oids));
}

function formatOidHex(oidHex: string): string {
  const knownOidLabels: Record<string, string> = {
    '04007F00070202040202': 'PACE ECDH GM AES-CBC-CMAC-128',
    '04007F00070202040203': 'PACE ECDH GM AES-CBC-CMAC-192',
    '04007F00070202040204': 'PACE ECDH GM AES-CBC-CMAC-256',
    '04007F00070202040102': 'PACE DH GM AES-CBC-CMAC-128',
    '04007F00070202040103': 'PACE DH GM AES-CBC-CMAC-192',
    '04007F00070202040104': 'PACE DH GM AES-CBC-CMAC-256',
  };

  return knownOidLabels[oidHex] ?? `OID ${decodeOid(oidHex)} (${oidHex})`;
}

function decodeOid(oidHex: string): string {
  const bytes = hexToBytes(oidHex);

  if (bytes.length === 0) {
    return oidHex;
  }

  const values: number[] = [];
  const first = bytes[0];
  values.push(Math.floor(first / 40));
  values.push(first % 40);

  let current = 0;
  for (const byte of bytes.slice(1)) {
    // ASN.1 OID base-128 decoding is naturally bitwise.
    // eslint-disable-next-line no-bitwise
    current = (current << 7) | (byte & 0x7f);
    // eslint-disable-next-line no-bitwise
    if ((byte & 0x80) === 0) {
      values.push(current);
      current = 0;
    }
  }

  return values.join('.');
}

function extractNameHints(responseHex: string): string[] {
  if (responseHex.length < 4) {
    return [];
  }

  const bytes = hexToBytes(responseHex);
  const ascii = bytes
    .map(byte => (byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ' '))
    .join(' ');

  const matches = ascii.match(/[A-Z][A-Z -]{3,}/g) ?? [];

  return Array.from(
    new Set(
      matches
        .map(match => match.replace(/\s+/g, ' ').trim())
        .filter(match => match.length >= 5),
    ),
  ).slice(0, 5);
}

function maskDigits(value: string): string {
  return value.replace(/\d/g, '*');
}

function encodeAscii(value: string): number[] {
  return value.split('').map(char => char.charCodeAt(0));
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function stripStatusWord(responseHex: string): string {
  return responseHex.length >= 4 ? responseHex.slice(0, -4) : responseHex;
}

function hexToBytes(value: string): number[] {
  const normalized = sanitizeHex(value);
  const bytes: number[] = [];

  for (let index = 0; index < normalized.length; index += 2) {
    bytes.push(Number.parseInt(normalized.slice(index, index + 2), 16));
  }

  return bytes;
}

function sanitizeHex(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-F]/g, '');
}

function normalizeTechTypes(techTypes: string[] | undefined): string[] {
  return (techTypes ?? []).map(techType => techType.split('.').pop() ?? techType);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown NFC error.';
}

function cancelTechnologyRequest() {
  NfcManager.cancelTechnologyRequest().catch(() => undefined);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  hero: {
    paddingVertical: 12,
    gap: 8,
  },
  eyebrow: {
    color: '#69d2e7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f4f7fb',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  lead: {
    color: '#b8c7dc',
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#d9ff66',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 20,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#07111f',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#69d2e7',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#07111f',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonAlt: {
    marginTop: 12,
  },
  card: {
    backgroundColor: '#10213a',
    borderColor: '#1f3554',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '700',
  },
  cardText: {
    color: '#d4deec',
    fontSize: 15,
    lineHeight: 22,
  },
  inputLabel: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#09172a',
    borderColor: '#2c486f',
    borderRadius: 14,
    borderWidth: 1,
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hint: {
    color: '#9ec2eb',
    fontSize: 13,
    lineHeight: 20,
  },
  apduRow: {
    backgroundColor: '#09172a',
    borderRadius: 14,
    gap: 6,
    padding: 12,
  },
  detail: {
    color: '#9ec2eb',
    fontSize: 14,
    lineHeight: 20,
  },
  okText: {
    color: '#9bffba',
  },
  failText: {
    color: '#ffb4bc',
  },
  warning: {
    backgroundColor: '#3c1c1f',
    borderColor: '#6f2b31',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  warningTitle: {
    color: '#ffd8dc',
    fontSize: 18,
    fontWeight: '700',
  },
  warningText: {
    color: '#ffd8dc',
    fontSize: 15,
    lineHeight: 22,
  },
  raw: {
    color: '#9ec2eb',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    lineHeight: 18,
  },
});

export default App;
