import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiGet } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';

type Props = {
  profile: FixedIdentityProfile;
  onBack(): void;
  onOpenGroup(groupId: string): void;
};

type GroupCard = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  membersCount: number;
  role?: string;
  visibility: 'public' | 'private';
  groupKind: 'standard' | 'private';
  neighborhoodName?: string;
};

type DiscoverGroupsResponse = {
  neighborhoodName: string;
  joinedGroups: GroupCard[];
};

export function JoinedGroupsScreen({ profile, onBack, onOpenGroup }: Props) {
  const [data, setData] = useState<DiscoverGroupsResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setBusy(true);
      try {
        const response = await apiGet<DiscoverGroupsResponse>('/communities/discover', profile.userId);
        if (mounted) {
          setData(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load joined groups.');
        }
      } finally {
        if (mounted) {
          setBusy(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [profile.userId]);

  return (
    <ScreenContainer>
      <TopBar title="Your Groups" leftActionLabel="Back" onLeftAction={onBack} />

      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>Joined Groups</Text>
        <Text style={styles.heroTitle}>{profile.homeNeighborhood}</Text>
        <Text style={styles.heroSubtitle}>Tap any group to open its chat, details, and participants.</Text>
      </View>

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading your groups...</Text>
        </View>
      ) : error ? (
        <SectionCard title="Groups Error">
          <Text style={styles.bodyText}>{error}</Text>
        </SectionCard>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SectionCard title={`Joined Groups (${data?.joinedGroups.length || 0})`}>
            {data?.joinedGroups.length ? (
              data.joinedGroups.map((group) => (
                <Pressable key={group.id} style={styles.groupRow} onPress={() => onOpenGroup(group.id)}>
                  <View style={styles.groupCopy}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    {group.description ? <Text style={styles.bodyText}>{group.description}</Text> : null}
                    <Text style={styles.metaText}>
                      {group.membersCount} members
                      {group.role ? ` · ${group.role}` : ''}
                      {group.visibility === 'private' ? ' · Private' : ' · Public'}
                    </Text>
                  </View>
                  <View style={styles.openBadge}>
                    <Text style={styles.openBadgeText}>Open</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={styles.bodyText}>You have not joined any groups yet. Go to Discover Groups to join some.</Text>
            )}
          </SectionCard>
        </ScrollView>
      )}
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
  groupRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  groupCopy: {
    flex: 1
  },
  groupName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4
  },
  bodyText: {
    color: colors.textMuted,
    lineHeight: 20
  },
  metaText: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 6
  },
  openBadge: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#D7F5EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  openBadgeText: {
    color: '#0D5E57',
    fontWeight: '800'
  }
});
