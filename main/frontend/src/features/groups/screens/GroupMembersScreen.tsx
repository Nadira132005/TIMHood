import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiGet, apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';
import { toImageUri } from '../../../shared/utils/images';

type Props = {
  profile: FixedIdentityProfile;
  groupId: string;
  onBack(): void;
};

type GroupDetails = {
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

type GroupMember = {
  userId: string;
  fullName: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  bio?: string;
  photoBase64?: string;
};

type GroupMembersResponse = {
  group: GroupDetails;
  requesterRole: 'owner' | 'admin' | 'member';
  members: GroupMember[];
  invitableFriends: Array<{ userId: string; fullName: string }>;
};

type PublicProfile = {
  userId: string;
  fullName: string;
  photoBase64?: string;
  bio?: string;
  age?: number;
  neighborhood?: string | null;
  lastSeenAt?: string;
};

type RelationshipResponse = {
  targetUserId: string;
  status: 'self' | 'friends' | 'request_sent' | 'request_received' | 'none';
};

type DirectChatMessage = {
  id: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type DirectChatResponse = {
  relationship: 'friends';
  messages: DirectChatMessage[];
};

export function GroupMembersScreen({ profile, groupId, onBack }: Props) {
  const [data, setData] = useState<GroupMembersResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipResponse['status']>('none');
  const [directChat, setDirectChat] = useState<DirectChatResponse | null>(null);
  const [directMessageText, setDirectMessageText] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setBusy(true);
      try {
        const response = await apiGet<GroupMembersResponse>(`/communities/${groupId}/members`, profile.userId);
        if (mounted) {
          setData(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load group members.');
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
  }, [groupId, profile.userId]);

  async function reload() {
    const response = await apiGet<GroupMembersResponse>(`/communities/${groupId}/members`, profile.userId);
    setData(response);
  }

  async function handlePromote(memberUserId: string) {
    setSubmitting(true);
    try {
      await apiPost(`/communities/${groupId}/admins/${memberUserId}`, {}, profile.userId);
      await reload();
      setError(null);
    } catch (promoteError) {
      setError(promoteError instanceof Error ? promoteError.message : 'Unable to promote member.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvite(friendUserId: string) {
    setSubmitting(true);
    try {
      await apiPost(`/communities/${groupId}/invite`, { invitedUserId: friendUserId }, profile.userId);
      await reload();
      setError(null);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Unable to invite friend.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openMemberActions(member: GroupMember) {
    if (member.userId === profile.userId) {
      return;
    }

    setSelectedMember(member);
    try {
      const [profileResponse, relationshipResponse] = await Promise.all([
        apiGet<PublicProfile>(`/identity/users/${member.userId}`, profile.userId),
        apiGet<RelationshipResponse>(`/social/relationships/${member.userId}`, profile.userId)
      ]);
      setPublicProfile(profileResponse);
      setRelationship(relationshipResponse.status);
      setDirectChat(null);
      setDirectMessageText('');
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load member actions.');
    }
  }

  async function handleFriendAction() {
    if (!selectedMember) {
      return;
    }

    try {
      if (relationship === 'request_received') {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedMember.userId}/respond`,
          { accept: true },
          profile.userId
        );
        setRelationship(response.status);
      } else if (relationship === 'none') {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedMember.userId}`,
          {},
          profile.userId
        );
        setRelationship(response.status);
      }
      setError(null);
    } catch (friendError) {
      setError(friendError instanceof Error ? friendError.message : 'Unable to update friendship.');
    }
  }

  async function openDirectChat() {
    if (!selectedMember) {
      return;
    }

    try {
      const response = await apiGet<DirectChatResponse>(`/social/direct-chats/${selectedMember.userId}`, profile.userId);
      setDirectChat(response);
      setError(null);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Unable to open private chat.');
    }
  }

  async function handleSendDirectMessage() {
    if (!selectedMember || !directMessageText.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost<DirectChatMessage>(
        `/social/direct-chats/${selectedMember.userId}/messages`,
        { text: directMessageText },
        profile.userId
      );
      setDirectChat((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, response]
            }
          : current
      );
      setDirectMessageText('');
      setError(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send private message.');
    } finally {
      setSubmitting(false);
    }
  }

  function closeMemberActions() {
    setSelectedMember(null);
    setPublicProfile(null);
    setRelationship('none');
    setDirectChat(null);
    setDirectMessageText('');
  }

  const canManage = data?.requesterRole === 'owner' || data?.requesterRole === 'admin';

  return (
    <ScreenContainer>
      <TopBar title="Group Members" leftActionLabel="Back" onLeftAction={onBack} />

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : error ? (
        <SectionCard title="Members Error">
          <Text style={styles.bodyText}>{error}</Text>
        </SectionCard>
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>Group</Text>
            <Text style={styles.heroTitle}>{data.group.name}</Text>
            <Text style={styles.heroSubtitle}>
              {data.group.membersCount} members · {data.group.visibility === 'private' ? 'Private' : 'Public'}
            </Text>
          </View>

          <SectionCard title="Members">
            {data.members.map((member) => (
              <View key={member.userId} style={styles.memberRow}>
                <Pressable style={styles.memberTapArea} onPress={() => openMemberActions(member)}>
                  {member.photoBase64 ? (
                    <Image source={{ uri: toImageUri(member.photoBase64)! }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{member.fullName.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <Text style={styles.memberMeta}>{member.role}</Text>
                    {member.bio ? <Text style={styles.bodyText}>{member.bio}</Text> : null}
                  </View>
                </Pressable>
                {canManage && data.group.visibility === 'private' && member.role === 'member' ? (
                  <Pressable
                    style={[styles.actionButton, submitting && styles.buttonDisabled]}
                    onPress={() => handlePromote(member.userId)}
                    disabled={submitting}
                  >
                    <Text style={styles.actionButtonText}>Make admin</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </SectionCard>

          {canManage && data.group.visibility === 'private' ? (
            <SectionCard title="Invite Friends">
              {data.invitableFriends.length ? (
                data.invitableFriends.map((friend) => (
                  <View key={friend.userId} style={styles.inviteRow}>
                    <Text style={styles.memberName}>{friend.fullName}</Text>
                    <Pressable
                      style={[styles.actionButton, submitting && styles.buttonDisabled]}
                      onPress={() => handleInvite(friend.userId)}
                      disabled={submitting}
                    >
                      <Text style={styles.actionButtonText}>Invite</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.bodyText}>No accepted friends left to invite.</Text>
              )}
            </SectionCard>
          ) : null}
        </ScrollView>
      ) : null}

      {selectedMember && publicProfile ? (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{publicProfile.fullName}</Text>
            {publicProfile.photoBase64 ? (
              <Image source={{ uri: toImageUri(publicProfile.photoBase64)! }} style={styles.profilePhoto} />
            ) : null}
            <Text style={styles.sheetText}>Age: {publicProfile.age ?? 'Unknown'}</Text>
            <Text style={styles.sheetText}>Neighborhood: {publicProfile.neighborhood || 'Unknown'}</Text>
            <Text style={styles.sheetText}>
              Last active: {publicProfile.lastSeenAt ? new Date(publicProfile.lastSeenAt).toLocaleString() : 'Unknown'}
            </Text>
            <Text style={styles.bodyText}>{publicProfile.bio || 'No description yet.'}</Text>

            {relationship === 'friends' ? (
              <Pressable style={styles.actionPrimaryButton} onPress={openDirectChat}>
                <Text style={styles.actionPrimaryButtonText}>Open private chat</Text>
              </Pressable>
            ) : relationship === 'request_received' ? (
              <Pressable style={styles.actionPrimaryButton} onPress={handleFriendAction}>
                <Text style={styles.actionPrimaryButtonText}>Accept friend request</Text>
              </Pressable>
            ) : relationship === 'none' ? (
              <Pressable style={styles.actionPrimaryButton} onPress={handleFriendAction}>
                <Text style={styles.actionPrimaryButtonText}>Send friend request</Text>
              </Pressable>
            ) : (
              <Text style={styles.pendingText}>
                {relationship === 'request_sent' ? 'Friend request already sent.' : 'This is your own member card.'}
              </Text>
            )}

            {directChat ? (
              <View style={styles.directChatBlock}>
                <Text style={styles.memberName}>Private Chat</Text>
                <ScrollView style={styles.directMessages} contentContainerStyle={styles.directMessagesContent}>
                  {directChat.messages.map((message) => (
                    <View
                      key={message.id}
                      style={[styles.directBubble, message.isOwnMessage ? styles.ownBubble : styles.otherBubble]}
                    >
                      {message.text ? <Text style={styles.bodyText}>{message.text}</Text> : null}
                      <Text style={styles.directTimestamp}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.directComposer}>
                  <TextInput
                    value={directMessageText}
                    onChangeText={setDirectMessageText}
                    placeholder="Write a private message"
                    placeholderTextColor={colors.textMuted}
                    style={styles.directInput}
                    multiline
                  />
                  <Pressable
                    style={[styles.actionButton, submitting && styles.buttonDisabled]}
                    onPress={handleSendDirectMessage}
                    disabled={submitting}
                  >
                    <Text style={styles.actionButtonText}>Send</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Pressable style={styles.closeButton} onPress={closeMemberActions}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  memberTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D7F5EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#0D5E57',
    fontWeight: '800'
  },
  memberCopy: {
    flex: 1
  },
  memberName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15
  },
  memberMeta: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 4
  },
  bodyText: {
    color: colors.textMuted,
    lineHeight: 20
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  actionButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '85%'
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800'
  },
  sheetText: {
    color: colors.primary,
    fontWeight: '700'
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center'
  },
  actionPrimaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionPrimaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  pendingText: {
    color: colors.textMuted,
    lineHeight: 20
  },
  directChatBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm
  },
  directMessages: {
    maxHeight: 220
  },
  directMessagesContent: {
    gap: spacing.xs
  },
  directBubble: {
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  ownBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#D7F5EE'
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6'
  },
  directTimestamp: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4
  },
  directComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm
  },
  directInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: '#F9FAFB'
  },
  closeButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeButtonText: {
    color: colors.text,
    fontWeight: '700'
  }
});
