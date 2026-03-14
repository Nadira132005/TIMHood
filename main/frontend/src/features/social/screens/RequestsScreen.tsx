import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

type FriendRequestItem = {
  fromUserId: string;
  fullName: string;
  bio?: string;
  photoBase64?: string;
};

type GroupInviteItem = {
  inviteId: string;
  communityId: string;
  groupName: string;
  inviterUserId: string;
  inviterName: string;
};

export function RequestsScreen({ profile, onBack }: Props) {
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInviteItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    try {
      const [friends, groups] = await Promise.all([
        apiGet<FriendRequestItem[]>('/social/friend-requests/pending', profile.userId),
        apiGet<GroupInviteItem[]>('/communities/invites/pending', profile.userId)
      ]);
      setFriendRequests(friends);
      setGroupInvites(groups);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load requests.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [profile.userId]);

  async function handleFriendResponse(fromUserId: string, accept: boolean) {
    setSubmitting(true);
    try {
      await apiPost(`/social/friend-requests/${fromUserId}/respond`, { accept }, profile.userId);
      await load();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Unable to respond to friend request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGroupInviteResponse(inviteId: string, accept: boolean) {
    setSubmitting(true);
    try {
      await apiPost(`/communities/invites/${inviteId}/respond`, { accept }, profile.userId);
      await load();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Unable to respond to group invite.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <TopBar title="Requests" leftActionLabel="Back" onLeftAction={onBack} />

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SectionCard title={`Friend Requests (${friendRequests.length})`}>
            {friendRequests.length ? (
              friendRequests.map((request) => (
                <View key={request.fromUserId} style={styles.row}>
                  <UserAvatar photoBase64={request.photoBase64} label={request.fullName} size={44} />
                  <View style={styles.copy}>
                    <Text style={styles.name}>{request.fullName}</Text>
                    {request.bio ? <Text style={styles.bodyText}>{request.bio}</Text> : null}
                  </View>
                  <ActionButtons
                    submitting={submitting}
                    onAccept={() => handleFriendResponse(request.fromUserId, true)}
                    onDecline={() => handleFriendResponse(request.fromUserId, false)}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>No pending friend requests.</Text>
            )}
          </SectionCard>

          <SectionCard title={`Group Invitations (${groupInvites.length})`}>
            {groupInvites.length ? (
              groupInvites.map((invite) => (
                <View key={invite.inviteId} style={styles.row}>
                  <UserAvatar label={invite.groupName} size={44} />
                  <View style={styles.copy}>
                    <Text style={styles.name}>{invite.groupName}</Text>
                    <Text style={styles.bodyText}>Invited by {invite.inviterName}</Text>
                  </View>
                  <ActionButtons
                    submitting={submitting}
                    onAccept={() => handleGroupInviteResponse(invite.inviteId, true)}
                    onDecline={() => handleGroupInviteResponse(invite.inviteId, false)}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>No pending group invitations.</Text>
            )}
          </SectionCard>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function ActionButtons({
  submitting,
  onAccept,
  onDecline
}: {
  submitting: boolean;
  onAccept(): void;
  onDecline(): void;
}) {
  return (
    <View style={styles.actions}>
      <Pressable style={[styles.acceptButton, submitting && styles.buttonDisabled]} onPress={onAccept} disabled={submitting}>
        <Text style={styles.acceptButtonText}>Accept</Text>
      </Pressable>
      <Pressable style={[styles.rejectButton, submitting && styles.buttonDisabled]} onPress={onDecline} disabled={submitting}>
        <Text style={styles.rejectButtonText}>Decline</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  bodyText: {
    color: colors.textMuted,
    lineHeight: 20
  },
  actions: {
    gap: spacing.xs
  },
  acceptButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  rejectButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rejectButtonText: {
    color: colors.text,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  errorText: {
    marginTop: spacing.sm,
    color: '#B42318'
  }
});
