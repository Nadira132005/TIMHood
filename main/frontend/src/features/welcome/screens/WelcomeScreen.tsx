import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ImageViewerModal } from '../../../shared/ui/ImageViewerModal';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';
import { UserAvatar } from '../../../shared/ui/UserAvatar';
import { toImageUri } from '../../../shared/utils/images';

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
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showPhotoToOthers, setShowPhotoToOthers] = useState(profile.showPhotoToOthers);
  const [showAgeToOthers, setShowAgeToOthers] = useState(profile.showAgeToOthers);

  useEffect(() => {
    setShowPhotoToOthers(profile.showPhotoToOthers);
    setShowAgeToOthers(profile.showAgeToOthers);
  }, [profile.showAgeToOthers, profile.showPhotoToOthers]);

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

  async function handleSavePrivacy() {
    setSaving(true);
    try {
      const updated = await apiPost<FixedIdentityProfile>(
        '/identity/privacy',
        { showPhotoToOthers, showAgeToOthers },
        profile.userId
      );
      onProfileUpdated(updated);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save privacy settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <TopBar title="Profile" leftActionLabel="Back" onLeftAction={onBack} />

      <View style={styles.profileHeader}>
        <Pressable style={styles.heroAvatar} onPress={() => setShowPhotoViewer(true)}>
          <UserAvatar photoBase64={profile.photoBase64} label={profile.fullName} size={104} />
        </Pressable>
        <Text style={styles.heroTitle}>{profile.fullName}</Text>
        <Text style={styles.heroSubtitle}>Your NFC identity is fixed. Your description is the editable part, like on WhatsApp.</Text>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>

      <SectionCard title="Identity Profile">
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

      <SectionCard title="Privacy">
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Show photo to others</Text>
            <Text style={styles.toggleText}>Let other people see your profile photo.</Text>
          </View>
          <Switch value={showPhotoToOthers} onValueChange={setShowPhotoToOthers} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Show age to others</Text>
            <Text style={styles.toggleText}>Let other people see your age on your profile.</Text>
          </View>
          <Switch value={showAgeToOthers} onValueChange={setShowAgeToOthers} trackColor={{ true: colors.primary }} />
        </View>
        <Pressable style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={handleSavePrivacy} disabled={saving}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Save privacy</Text>}
        </Pressable>
      </SectionCard>

      <SectionCard title="Home Area">
        <ProfileRow label="Address" value={profile.homeAddressLabel || 'Not provided'} />
        <ProfileRow label="Neighborhood" value={profile.homeNeighborhood || 'Not set'} />
        <Pressable style={styles.secondaryButton} onPress={onEditAddress}>
          <Text style={styles.secondaryButtonText}>Change address and neighborhood</Text>
        </Pressable>
      </SectionCard>

      <ImageViewerModal
        visible={showPhotoViewer}
        imageUri={toImageUri(profile.photoBase64)}
        title={profile.fullName}
        onClose={() => setShowPhotoViewer(false)}
      />
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
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#0D5E57',
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  heroTitle: {
    marginTop: spacing.md,
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 28
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    color: '#D7F5EE',
    lineHeight: 22,
    textAlign: 'center'
  },
  heroAvatar: {
    marginBottom: spacing.md
  },
  logoutButton: {
    marginTop: spacing.md,
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)'
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '800'
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
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  toggleCopy: {
    flex: 1
  },
  toggleTitle: {
    color: colors.text,
    fontWeight: '800'
  },
  toggleText: {
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18
  }
});
