import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiPost } from "../../../shared/api/client";
import { AuthSession, FixedIdentityProfile } from "../../../shared/state/session";
import { colors, spacing } from "../../../shared/theme/tokens";
import { ScreenContainer } from "../../../shared/ui/ScreenContainer";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { readIdentityCard } from "../lib/cei-reader";

type Props = {
  onLogin(auth: AuthSession, profile: FixedIdentityProfile): void;
};

type LoginResponse = {
  userId: string;
  token: string;
  expiresAt?: string | null;
  profile: FixedIdentityProfile;
};

const DEMO_CANS = new Set(["0000", "0001", "0002"]);
const RETRY_ERROR_MESSAGE =
  "Something went wrong. Please retry and keep the ID card on the back of the phone.";

export function LoginScreen({ onLogin }: Props) {
  const [can, setCan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReadCard() {
    const trimmedCan = can.trim();
    if (!/^\d{4,6}$/.test(trimmedCan)) {
      setError("Enter the CAN from the Romanian ID card.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (DEMO_CANS.has(trimmedCan)) {
        const response = await apiPost<LoginResponse>("/identity/demo-login", {
          can: trimmedCan,
        });
        onLogin(
          { token: response.token, expiresAt: response.expiresAt ?? null },
          response.profile,
        );
      } else {
        const response = await apiPost<LoginResponse>(
          "/identity/nfc-login",
          await readIdentityCard(trimmedCan),
        );
        onLogin(
          { token: response.token, expiresAt: response.expiresAt ?? null },
          response.profile,
        );
      }
    } catch (error) {
      console.error(error);
      setError(RETRY_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <View style={styles.heroPanel}>
          <View style={styles.brandPill}>
            <Text style={styles.brandPillText}>TIMHood</Text>
          </View>
          <Text style={styles.welcomeLabel}>Welcome home</Text>
          <Text style={styles.title}>Get to know your neighbours.</Text>
          <Text style={styles.subtitle}>
            Sign in now with your Romanian ID card and join the people, groups,
            and conversations around your neighborhood.
          </Text>
          <Text style={styles.microCopy}>
            Your ID details stay fixed as your verified local profile.
          </Text>
        </View>
      </View>

      <SectionCard title="Sign In">
        <Text style={styles.label}>Card Access Number (CAN)</Text>
        <TextInput
          value={can}
          onChangeText={(value) => setCan(value.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          placeholder="Enter 6-digit CAN"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          editable={!busy}
        />
        <View style={styles.nfcHintCard}>
          <Text style={styles.nfcHintTitle}>
            Keep the ID card on the back of the phone
          </Text>
          <Text style={styles.nfcHintText}>
            Hold it steady during the full NFC read.
          </Text>
        </View>
        <Pressable
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          onPress={handleReadCard}
          disabled={busy}
        >
          {busy ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.primaryButtonText}>Signing in...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Sign in now</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <View style={styles.footnoteBlock}>
        <Text style={styles.footnoteText}>
          Enter the CAN, tap sign in, and keep the ID card behind the phone
          until the read finishes.
        </Text>
        <Text style={styles.footnoteText}>
          {Platform.OS === "android"
            ? "This login needs an Android build with the id_reader native module and real NFC hardware."
            : "This screen is for Android NFC login. iOS and Expo Go cannot complete this flow yet."}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroPanel: {
    borderRadius: 26,
    padding: spacing.lg,
    backgroundColor: "#F0F9F7",
    borderWidth: 1,
    borderColor: "#CDEBE4",
  },
  brandPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#D7F5EE",
  },
  brandPillText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  welcomeLabel: {
    marginTop: spacing.md,
    color: "#0D5E57",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
  },
  microCopy: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 18,
    backgroundColor: "#F9FBFC",
    marginBottom: spacing.md,
  },
  backendInput: {
    fontSize: 16,
  },
  backendInputCompact: {
    marginBottom: 0,
  },
  nfcHintCard: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: "#EEF8F6",
    borderWidth: 1,
    borderColor: "#B7E4DB",
  },
  nfcHintTitle: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  nfcHintText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  errorText: {
    marginTop: spacing.sm,
    color: "#B42318",
    lineHeight: 20,
  },
  footnoteBlock: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  footnoteText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  connectionToggle: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  connectionToggleText: {
    color: colors.primary,
    fontWeight: "700",
  },
  connectionPanel: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
