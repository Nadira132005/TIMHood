import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { readIdentityCard } from '../lib/cei-reader';

type Props = {
  onLogin(profile: FixedIdentityProfile): void;
};

type LoginResponse = {
  userId: string;
  profile: FixedIdentityProfile;
};

export function LoginScreen({ onLogin }: Props) {
  const [can, setCan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReadCard() {
    setBusy(true);
    setError(null);

    try {
      const identity = await readIdentityCard(can);
      const response = await apiPost<LoginResponse>('/identity/nfc-login', identity);
      onLogin(response.profile);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Unable to read the ID card.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Timhood Login</Text>
        <Text style={styles.title}>Tap the Romanian ID card to sign in.</Text>
        <Text style={styles.subtitle}>
          The NFC read becomes the fixed account profile. The app stores document number, name,
          nationality, birth date, expiry date, and photo from the card.
        </Text>
      </View>

      <SectionCard title="Read ID">
        <Text style={styles.label}>Card Access Number (CAN)</Text>
        <TextInput
          value={can}
          onChangeText={(value) => setCan(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="Enter 6-digit CAN"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          editable={!busy}
        />
        <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={handleReadCard} disabled={busy}>
          {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Read ID with NFC</Text>}
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="How it works">
        <Text style={styles.bodyText}>1. Enter the 6-digit CAN printed on the card.</Text>
        <Text style={styles.bodyText}>2. Tap Read ID with NFC and hold the card behind the phone.</Text>
        <Text style={styles.bodyText}>3. If the document is still valid, the user is created or signed in automatically.</Text>
      </SectionCard>

      <SectionCard title="Device Requirement">
        <Text style={styles.bodyText}>
          {Platform.OS === 'android'
            ? 'This login needs an Android build with the id_reader native module and real NFC hardware.'
            : 'This screen is for Android NFC login. iOS and Expo Go cannot complete this flow yet.'}
        </Text>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.lg,
    paddingTop: spacing.lg
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  title: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800'
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 18,
    backgroundColor: '#F9FBFC',
    marginBottom: spacing.md
  },
  primaryButton: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16
  },
  errorText: {
    marginTop: spacing.sm,
    color: '#B42318',
    lineHeight: 20
  },
  bodyText: {
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.xs
  }
});
