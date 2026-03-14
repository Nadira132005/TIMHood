import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  NativeModules,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NfcManager from 'react-native-nfc-manager';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type NativePaceSummary = {
  fullName: string;
  firstName: string;
  lastName: string;
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

type NativePaceModule = {
  readNameWithPace(can: string): Promise<NativePaceSummary>;
};

type LoginProfile = {
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

type LoginResponse = {
  userId: string;
  profile: LoginProfile;
};

const nativePaceModule = (NativeModules.CeiNativeReader ?? null) as NativePaceModule | null;

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0b1618" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://192.168.50.152:4000/api');
  const [can, setCan] = useState('');
  const [busy, setBusy] = useState(false);
  const [supportStatus, setSupportStatus] = useState('Checking NFC availability...');
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LoginProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        const supported = await NfcManager.isSupported();
        const enabled = supported ? await NfcManager.isEnabled() : false;

        if (!mounted) {
          return;
        }

        if (!supported) {
          setSupportStatus('This phone does not support NFC.');
          return;
        }

        setSupportStatus(
          enabled
            ? 'NFC is enabled. Enter the CAN and hold the ID card behind the phone.'
            : 'NFC is supported, but disabled in Android settings.'
        );
      } catch (nfcError) {
        if (!mounted) {
          return;
        }

        setSupportStatus('Unable to initialize NFC on this phone.');
        setError(readMessage(nfcError));
      }
    }

    prepare();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin() {
    if (!/^\d{6}$/.test(can.trim())) {
      setError('Enter the 6-digit CAN printed on the card.');
      return;
    }

    if (!nativePaceModule) {
      setError('The native NFC reader module is not available in this build.');
      return;
    }

    if (!apiBaseUrl.trim()) {
      setError('Enter the backend API URL, for example http://192.168.50.152:4000/api.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const identity = await nativePaceModule.readNameWithPace(can.trim());
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/identity/nfc-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentNumber: identity.documentNumber,
          firstName: identity.firstName,
          lastName: identity.lastName,
          nationality: identity.nationality,
          issuingState: identity.issuingState,
          dateOfBirth: identity.dateOfBirth,
          dateOfExpiry: identity.dateOfExpiry,
          photoBase64: identity.dg2?.available ? identity.dg2.base64 : undefined,
        }),
      });

      const payload = (await response.json()) as LoginResponse | { error?: string };
      if (!response.ok) {
        throw new Error('error' in payload ? payload.error || 'Login failed.' : 'Login failed.');
      }

      setProfile((payload as LoginResponse).profile);
    } catch (loginError) {
      setError(readMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  if (profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>Welcome</Text>
            <Text style={styles.heroTitle}>{profile.fullName}</Text>
            <Text style={styles.heroSubtitle}>
              This profile was created from the NFC ID read and is locked to the document.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fixed Identity</Text>
            {profile.photoBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${profile.photoBase64}` }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoFallbackText}>
                  {profile.firstName[0]}
                  {profile.lastName[0]}
                </Text>
              </View>
            )}
            <ProfileRow label="User ID" value={profile.userId} />
            <ProfileRow label="Document number" value={profile.documentNumber} />
            <ProfileRow label="First name" value={profile.firstName} />
            <ProfileRow label="Last name" value={profile.lastName} />
            <ProfileRow label="Nationality" value={profile.nationality} />
            <ProfileRow label="Date of birth" value={profile.dateOfBirth} />
            <ProfileRow label="Date of expiry" value={profile.dateOfExpiry} />
            {profile.issuingState ? (
              <ProfileRow label="Issuing state" value={profile.issuingState} />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Document Status</Text>
            <Text style={styles.bodyText}>
              {profile.documentIsValid
                ? 'Document is valid. Login succeeded.'
                : 'Document is expired.'}
            </Text>
            <Text style={styles.hintText}>
              The app does not expose any edit action for these fields.
            </Text>
          </View>

          <Pressable style={styles.secondaryButton} onPress={() => setProfile(null)}>
            <Text style={styles.secondaryButtonText}>Read another card</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>Timhood Login</Text>
          <Text style={styles.heroTitle}>Hold the ID behind the phone to sign in.</Text>
          <Text style={styles.heroSubtitle}>
            The NFC read becomes the account profile: document number, first name, last name,
            nationality, birth date, expiry date, and photo.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backend API URL</Text>
          <TextInput
            value={apiBaseUrl}
            onChangeText={setApiBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.50.152:4000/api"
            placeholderTextColor="#7c8b90"
            style={styles.input}
            editable={!busy}
          />
          <Text style={styles.hintText}>
            Use your computer&apos;s LAN IP so the phone can reach the backend.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Card Access Number</Text>
          <TextInput
            value={can}
            onChangeText={(value) => setCan(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="6-digit CAN"
            placeholderTextColor="#7c8b90"
            style={styles.input}
            editable={!busy}
          />
          <Pressable
            style={[styles.primaryButton, busy && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Read ID and Login</Text>
            )}
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phone Status</Text>
          <Text style={styles.bodyText}>{supportStatus}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function readMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#edf4f3',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#0f5d57',
    borderRadius: 24,
    padding: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  heroKicker: {
    color: '#9ae6d8',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 6,
  },
  heroSubtitle: {
    color: '#dcf6f0',
    marginTop: 10,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d5dfdd',
  },
  cardTitle: {
    color: '#132024',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccd8d5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#132024',
    backgroundColor: '#f9fbfb',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    marginTop: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccd8d5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#132024',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 12,
    color: '#b42318',
    lineHeight: 20,
  },
  bodyText: {
    color: '#132024',
    lineHeight: 22,
  },
  hintText: {
    color: '#5f6f73',
    lineHeight: 20,
    marginTop: 8,
  },
  photo: {
    width: 110,
    height: 138,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#dfe8e6',
  },
  photoFallback: {
    width: 110,
    height: 138,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#d5f1eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: {
    color: '#0f5d57',
    fontSize: 30,
    fontWeight: '800',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: '#e3ece9',
    paddingVertical: 10,
  },
  rowLabel: {
    color: '#6b7b7e',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowValue: {
    color: '#132024',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },
});

export default App;
