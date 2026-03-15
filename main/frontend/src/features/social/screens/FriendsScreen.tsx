import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiGet, apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';
import { UserAvatar } from '../../../shared/ui/UserAvatar';
import { toImageUri } from '../../../shared/utils/images';

type Props = {
  profile: FixedIdentityProfile;
  onBack(): void;
};

type ContactItem = {
  userId: string;
  fullName: string;
  bio?: string;
  photoBase64?: string;
  neighborhood?: string | null;
  relationship: 'self' | 'friends' | 'request_sent' | 'request_received' | 'none';
};

type ContactsResponse = {
  friends: ContactItem[];
  community: ContactItem[];
};

export function FriendsScreen({ profile, onBack }: Props) {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<ContactsResponse>({ friends: [], community: [] });
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(search = query) {
    setBusy(true);
    try {
      const response = await apiGet<ContactsResponse>(`/social/contacts?q=${encodeURIComponent(search)}`, profile.userId);
      setData(response);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load friends.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load('');
  }, [profile.userId]);

  async function handleSearch() {
    await load(query);
  }

  async function handleFriendAction(userId: string, relationship: ContactItem['relationship']) {
    setSubmitting(userId);
    try {
      if (relationship === 'request_received') {
        await apiPost(`/social/friend-requests/${userId}/respond`, { accept: true }, profile.userId);
      } else if (relationship === 'none') {
        await apiPost(`/social/friend-requests/${userId}`, {}, profile.userId);
      }
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update friendship.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <ScreenContainer>
      <TopBar title="Friends" leftActionLabel="Back" onLeftAction={onBack} />

      <SectionCard title="Find people">
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>
        <Text style={styles.searchHint}>Search your friends or people from your neighborhood community.</Text>
      </SectionCard>

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading people...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SectionCard title={`Your Friends (${data.friends.length})`}>
            {data.friends.length ? data.friends.map((friend) => <ContactRow key={friend.userId} item={friend} />) : <Text style={styles.bodyText}>No friends yet.</Text>}
          </SectionCard>

          <SectionCard title={`From Your Community (${data.community.length})`}>
            {data.community.length ? (
              data.community.map((person) => (
                <ContactRow
                  key={person.userId}
                  item={person}
                  submitting={submitting === person.userId}
                  onAction={() => handleFriendAction(person.userId, person.relationship)}
                />
              ))
            ) : (
              <Text style={styles.bodyText}>No matching people found.</Text>
            )}
          </SectionCard>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function ContactRow({
  item,
  submitting,
  onAction
}: {
  item: ContactItem;
  submitting?: boolean;
  onAction?(): void;
}) {
  const actionLabel =
    item.relationship === 'friends'
      ? 'Friends'
      : item.relationship === 'request_sent'
        ? 'Requested'
        : item.relationship === 'request_received'
          ? 'Accept'
          : 'Add friend';

  return (
    <View style={styles.row}>
      <UserAvatar photoBase64={item.photoBase64} label={item.fullName} size={44} />
      <View style={styles.copy}>
        <Text style={styles.name}>{item.fullName}</Text>
        {item.neighborhood ? <Text style={styles.metaText}>{item.neighborhood}</Text> : null}
        {item.bio ? <Text style={styles.bodyText}>{item.bio}</Text> : null}
      </View>
      {item.relationship === 'friends' || item.relationship === 'request_sent' ? (
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{actionLabel}</Text>
        </View>
      ) : onAction ? (
        <Pressable style={[styles.actionButton, submitting && styles.buttonDisabled]} onPress={onAction} disabled={submitting}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text
  },
  searchButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  searchHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    lineHeight: 18
  },
  loadingBlock: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm
  },
  loadingText: {
    color: colors.textMuted
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center'
  },
  copy: {
    flex: 1
  },
  name: {
    color: colors.text,
    fontWeight: '800'
  },
  metaText: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2
  },
  bodyText: {
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 2
  },
  actionButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  statusPill: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft
  },
  statusPillText: {
    color: colors.accent,
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  errorText: {
    marginTop: spacing.sm,
    color: '#B42318'
  }
});
