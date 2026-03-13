import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

        {apduResults.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>APDU probe</Text>
            <Text style={styles.cardText}>
              These commands test whether the chip responds like a standard
              ICAO e-document over `IsoDep`.
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
    const response = await NfcManager.isoDepHandler.transceive(command.bytes);
    results.push(toApduResult(command.label, command.bytes, response));
  }

  return results;
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

function maskDigits(value: string): string {
  return value.replace(/\d/g, '*');
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
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
