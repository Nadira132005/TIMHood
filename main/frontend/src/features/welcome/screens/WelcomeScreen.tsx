import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';

type Props = {
  profile: FixedIdentityProfile;
  onBack(): void;
  onLogout(): void;
  onEditAddress(): void;
  onProfileUpdated(profile: FixedIdentityProfile): void;
};

export function WelcomeScreen({ profile, onBack, onLogout, onEditAddress, onProfileUpdated }: Props) {
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveBio() {
    setSaving(true);
    try {
      const updated = await apiPost<FixedIdentityProfile>('/identity/bio', { bio }, profile.userId);
      onProfileUpdated(updated);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save description.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <TopBar title="Profile" leftActionLabel="Back" onLeftAction={onBack} rightActionLabel="Logout" onRightAction={onLogout} />

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Welcome</Text>
        <Text style={styles.heroTitle}>{profile.fullName}</Text>
        <Text style={styles.heroSubtitle}>Your NFC identity is fixed. Your description is the editable part, like on WhatsApp.</Text>
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

      <SectionCard title="About You">
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Add a short description"
          placeholderTextColor={colors.textMuted}
          style={styles.bioInput}
          multiline
          maxLength={280}
        />
        <Pressable style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={handleSaveBio} disabled={saving}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Save description</Text>}
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="Home Area">
        <ProfileRow label="Address" value={profile.homeAddressLabel || 'Not provided'} />
        <ProfileRow label="Neighborhood" value={profile.homeNeighborhood || 'Not set'} />
        <Pressable style={styles.secondaryButton} onPress={onEditAddress}>
          <Text style={styles.secondaryButtonText}>Change address and neighborhood</Text>
        </Pressable>
      </SectionCard>
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
  bioInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    backgroundColor: '#F9FBFC',
    textAlignVertical: 'top'
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  errorText: {
    marginTop: spacing.sm,
    color: '#B42318'
  },
  secondaryButton: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700'
  }
});
