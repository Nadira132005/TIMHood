import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { apiGet } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';

type Props = {
  profile: FixedIdentityProfile;
  onOpenProfile(): void;
  onOpenNeighborhoodGroup(groupId: string): void;
  onOpenDiscoverGroups(): void;
  onOpenJoinedGroups(): void;
  onOpenFriends(): void;
  onOpenFriendRequests(): void;
};

type NeighborhoodSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  source: string;
  mapTop: number;
  mapLeft: number;
  mapWidth: number;
  mapHeight: number;
};

type NeighborhoodMessage = {
  id: string;
  userId: string;
  userName: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type NeighborhoodChatResponse = {
  neighborhood: NeighborhoodSummary;
  participantsCount: number;
  messages: NeighborhoodMessage[];
};

type GroupCard = {
  id: string;
  name: string;
  neighborhoodName?: string;
};

type DiscoverGroupsResponse = {
  joinedGroups: GroupCard[];
};

export function DashboardScreen({
  profile,
  onOpenProfile,
  onOpenNeighborhoodGroup,
  onOpenDiscoverGroups,
  onOpenJoinedGroups,
  onOpenFriends,
  onOpenFriendRequests
}: Props) {
  const [data, setData] = useState<NeighborhoodChatResponse | null>(null);
  const [neighborhoodGroupId, setNeighborhoodGroupId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadNeighborhood() {
      setBusy(true);
      try {
        const [chatResponse, groupsResponse] = await Promise.all([
          apiGet<NeighborhoodChatResponse>('/neighborhoods/my-chat', profile.userId),
          apiGet<DiscoverGroupsResponse>('/communities/discover', profile.userId)
        ]);
        const defaultNeighborhoodGroup = groupsResponse.joinedGroups.find(
          (group) =>
            group.name.includes('General / Announcements') &&
            (!profile.homeNeighborhood || group.neighborhoodName === profile.homeNeighborhood)
        );

        if (mounted) {
          setData(chatResponse);
          setNeighborhoodGroupId(defaultNeighborhoodGroup?.id || null);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setData(null);
          setNeighborhoodGroupId(null);
          setError(loadError instanceof Error ? loadError.message : 'Unable to load neighborhood.');
        }
      } finally {
        if (mounted) {
          setBusy(false);
        }
      }
    }

    void loadNeighborhood();

    return () => {
      mounted = false;
    };
  }, [profile.homeNeighborhood, profile.userId]);

  return (
    <ScreenContainer>
      <TopBar
        title="Neighborhood"
        rightActionLabel="Profile"
        onRightAction={onOpenProfile}
      />

      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>Your Area</Text>
        <Text style={styles.heroTitle}>{profile.homeNeighborhood || 'Neighborhood pending'}</Text>
        <Text style={styles.heroSubtitle}>
          After login, this is your local hub. Tap the neighborhood group below to open the main group for your area.
        </Text>
      </View>

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading neighborhood page...</Text>
        </View>
      ) : error ? (
        <SectionCard title="Neighborhood Error">
          <Text style={styles.bodyText}>{error}</Text>
        </SectionCard>
      ) : data ? (
        <>
          <Pressable
            style={styles.groupCardPressable}
            onPress={() => {
              if (neighborhoodGroupId) {
                onOpenNeighborhoodGroup(neighborhoodGroupId);
              }
            }}
            disabled={!neighborhoodGroupId}
          >
            <SectionCard title="Neighborhood Group">
              <Text style={styles.neighborhoodName}>{data.neighborhood.name}</Text>
              <Text style={styles.bodyText}>{data.neighborhood.description}</Text>
              <Text style={styles.metaText}>{data.participantsCount} registered neighbors</Text>
              <Text style={styles.groupLinkText}>
                {neighborhoodGroupId ? 'Tap to open your neighborhood group' : 'Neighborhood group is not available yet.'}
              </Text>
            </SectionCard>
          </Pressable>

          <Pressable style={styles.primaryButtonAlt} onPress={onOpenDiscoverGroups}>
            <Text style={styles.primaryButtonAltText}>Discover groups</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonAlt} onPress={onOpenJoinedGroups}>
            <Text style={styles.primaryButtonAltText}>Your groups</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonAlt} onPress={onOpenFriends}>
            <Text style={styles.primaryButtonAltText}>Friends</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonAlt} onPress={onOpenFriendRequests}>
            <Text style={styles.primaryButtonAltText}>Requests</Text>
          </Pressable>
        </>
      ) : null}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#0D5E57',
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  heroKicker: {
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
  loadingBlock: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm
  },
  loadingText: {
    color: colors.textMuted
  },
  neighborhoodName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: spacing.xs
  },
  metaText: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm
  },
  bodyText: {
    color: colors.textMuted,
    lineHeight: 22
  },
  groupCardPressable: {
    borderRadius: 20
  },
  groupLinkText: {
    color: colors.primary,
    fontWeight: '800',
    marginTop: spacing.sm
  },
  primaryButtonAlt: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  primaryButtonAltText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16
  }
});
