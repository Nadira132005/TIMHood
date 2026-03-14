import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

type Props = {
  profile: FixedIdentityProfile;
  onLogout(): void;
};

export function WelcomeScreen({ profile, onLogout }: Props) {
  return (
    <ScreenContainer>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Welcome</Text>
        <Text style={styles.heroTitle}>{profile.fullName}</Text>
        <Text style={styles.heroSubtitle}>Your profile is created from the NFC ID read and stays fixed.</Text>
      </View>

      <SectionCard title="Identity Profile">
        {profile.photoBase64 ? (
          <Image source={{ uri: `data:image/jpeg;base64,${profile.photoBase64}` }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {profile.firstName[0]}
              {profile.lastName[0]}
            </Text>
          </View>
        )}
        <ProfileRow label="User ID" value={profile.documentNumber} />
        <ProfileRow label="First name" value={profile.firstName} />
        <ProfileRow label="Last name" value={profile.lastName} />
        <ProfileRow label="Nationality" value={profile.nationality} />
        <ProfileRow label="Date of birth" value={profile.dateOfBirth} />
        <ProfileRow label="Date of expiry" value={profile.dateOfExpiry} />
        {profile.issuingState ? <ProfileRow label="Issuing state" value={profile.issuingState} /> : null}
      </SectionCard>

      <SectionCard title="Document Status">
        <Text style={styles.statusText}>
          {profile.documentIsValid ? 'Document is valid and the account is active.' : 'Document is expired.'}
        </Text>
        <Text style={styles.bodyText}>These fields come from the NFC identity read and cannot be edited in the app.</Text>
      </SectionCard>

      <Pressable style={styles.secondaryButton} onPress={onLogout}>
        <Text style={styles.secondaryButtonText}>Back to login</Text>
      </Pressable>
    </ScreenContainer>
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

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#0D5E57',
    borderRadius: 24,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  kicker: {
    color: '#9AE6D8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  heroTitle: {
    marginTop: spacing.xs,
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 28
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    color: '#D7F5EE',
    lineHeight: 22
  },
  avatar: {
    width: 96,
    height: 120,
    borderRadius: 18,
    marginBottom: spacing.md,
    backgroundColor: '#E5E7EB'
  },
  avatarPlaceholder: {
    width: 96,
    height: 120,
    borderRadius: 18,
    marginBottom: spacing.md,
    backgroundColor: '#D7F5EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarPlaceholderText: {
    color: '#0D5E57',
    fontWeight: '800',
    fontSize: 28
  },
  row: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4
  },
  statusText: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: spacing.xs
  },
  bodyText: {
    color: colors.textMuted,
    lineHeight: 22
  },
  secondaryButton: {
    marginTop: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700'
  }
});
