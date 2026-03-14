import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiGet, apiPost } from '../../../shared/api/client';
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
  standardGroups: GroupCard[];
  privateGroups: GroupCard[];
  friends: Array<{ userId: string; fullName: string }>;
};

type NeighborhoodOption = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export function DiscoverGroupsScreen({ profile, onBack, onOpenGroup }: Props) {
  const [data, setData] = useState<DiscoverGroupsResponse | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [search, setSearch] = useState(profile.homeNeighborhood ?? '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(profile.homeNeighborhood ?? '');
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateName, setPrivateName] = useState('');
  const [privateDescription, setPrivateDescription] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setBusy(true);
      try {
        const [response, neighborhoodList] = await Promise.all([
          apiGet<DiscoverGroupsResponse>(
            `/communities/discover${selectedNeighborhood ? `?neighborhood=${encodeURIComponent(selectedNeighborhood)}` : ''}`,
            profile.userId
          ),
          apiGet<NeighborhoodOption[]>('/neighborhoods')
        ]);
        if (mounted) {
          setData(response);
          setNeighborhoods(neighborhoodList);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load groups.');
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
  }, [profile.userId, selectedNeighborhood]);

  async function reload() {
    const response = await apiGet<DiscoverGroupsResponse>(
      `/communities/discover${selectedNeighborhood ? `?neighborhood=${encodeURIComponent(selectedNeighborhood)}` : ''}`,
      profile.userId
    );
    setData(response);
  }

  async function handleJoin(groupId: string) {
    setSubmitting(true);
    try {
      await apiPost(`/communities/${groupId}/join`, {}, profile.userId);
      await reload();
      setError(null);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Unable to join group.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreatePrivateGroup() {
    if (!privateName.trim()) {
      setError('Enter a private group name.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(
        '/communities/private',
        {
          name: privateName,
          description: privateDescription,
          memberUserIds: selectedFriendIds
        },
        profile.userId
      );
      setPrivateName('');
      setPrivateDescription('');
      setSelectedFriendIds([]);
      await reload();
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create private group.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleFriend(userId: string) {
    setSelectedFriendIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }

  const joinedIds = new Set(data?.joinedGroups.map((group) => group.id) || []);
  const standardGroupsToJoin = data?.standardGroups.filter((group) => !joinedIds.has(group.id)) ?? [];
  const privateGroupsToJoin = data?.privateGroups.filter((group) => !joinedIds.has(group.id)) ?? [];
  const filteredNeighborhoods = neighborhoods.filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <ScreenContainer>
      <TopBar title="Discover Groups" leftActionLabel="Back" onLeftAction={onBack} />

      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>Neighborhood Groups</Text>
        <Text style={styles.heroTitle}>{profile.homeNeighborhood}</Text>
        <Text style={styles.heroSubtitle}>
          Search any neighborhood, open its public groups, and join them. This page shows only groups you have not joined yet.
        </Text>
      </View>

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SectionCard title="Browse neighborhoods">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search neighborhood name, for example Giroc"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.friendWrap}>
              {filteredNeighborhoods.slice(0, 8).map((item) => {
                const active = selectedNeighborhood === item.name;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSelectedNeighborhood(item.name);
                      setSearch(item.name);
                    }}
                    style={[styles.friendChip, active && styles.friendChipActive]}
                  >
                    <Text style={[styles.friendChipText, active && styles.friendChipTextActive]}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard title={`Groups to Join in ${data.neighborhoodName}`}>
            {standardGroupsToJoin.length ? (
              standardGroupsToJoin.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  submitting={submitting}
                  onJoin={() => handleJoin(group.id)}
                  onOpen={() => onOpenGroup(group.id)}
                />
              ))
            ) : (
              <Text style={styles.bodyText}>You already joined all standard groups in this neighborhood.</Text>
            )}
          </SectionCard>

          <SectionCard title="Private Groups to Join">
            {privateGroupsToJoin.length ? (
              privateGroupsToJoin.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  submitting={submitting}
                  onJoin={() => handleJoin(group.id)}
                  onOpen={() => onOpenGroup(group.id)}
                />
              ))
            ) : (
              <Text style={styles.bodyText}>No other private groups are visible to you here.</Text>
            )}
          </SectionCard>

          <SectionCard title="Create Private Group">
            <TextInput
              value={privateName}
              onChangeText={setPrivateName}
              placeholder="Group name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={privateDescription}
              onChangeText={setPrivateDescription}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
              multiline
            />
            <Text style={styles.selectorTitle}>Invite friends</Text>
            <View style={styles.friendWrap}>
              {data.friends.length ? (
                data.friends.map((friend) => {
                  const active = selectedFriendIds.includes(friend.userId);
                  return (
                    <Pressable
                      key={friend.userId}
                      onPress={() => toggleFriend(friend.userId)}
                      style={[styles.friendChip, active && styles.friendChipActive]}
                    >
                      <Text style={[styles.friendChipText, active && styles.friendChipTextActive]}>
                        {friend.fullName}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.bodyText}>You need accepted friends before adding them to a private group.</Text>
              )}
            </View>
            <Pressable
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={handleCreatePrivateGroup}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>Create private group</Text>
            </Pressable>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </SectionCard>
        </ScrollView>
      ) : (
        <SectionCard title="Groups Error">
          <Text style={styles.bodyText}>{error || 'Unable to load groups.'}</Text>
        </SectionCard>
      )}
    </ScreenContainer>
  );
}

function GroupRow({
  group,
  submitting,
  onJoin,
  onOpen
}: {
  group: GroupCard;
  submitting: boolean;
  onJoin(): void;
  onOpen(): void;
}) {
  return (
    <Pressable style={styles.groupRow} onPress={onOpen}>
      <View style={styles.groupCopy}>
        <Text style={styles.groupName}>{group.name}</Text>
        {group.description ? <Text style={styles.bodyText}>{group.description}</Text> : null}
        <Text style={styles.metaText}>
          {group.membersCount} members · {group.visibility === 'private' ? 'Private' : 'Public'}
        </Text>
      </View>
      <Pressable style={[styles.joinButton, submitting && styles.buttonDisabled]} onPress={onJoin} disabled={submitting}>
        <Text style={styles.joinButtonText}>Join</Text>
      </Pressable>
    </Pressable>
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
  joinButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  joinButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: '#ffffff',
    marginBottom: spacing.sm
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  selectorTitle: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: spacing.xs
  },
  friendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  friendChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff'
  },
  friendChipActive: {
    backgroundColor: '#D7F5EE',
    borderColor: '#6DD3C4'
  },
  friendChipText: {
    color: colors.text,
    fontWeight: '700'
  },
  friendChipTextActive: {
    color: '#0D5E57'
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  errorText: {
    color: '#B42318',
    marginTop: spacing.sm
  }
});
