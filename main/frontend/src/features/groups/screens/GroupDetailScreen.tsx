import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { apiGet, apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { TopBar } from '../../../shared/ui/TopBar';

type Props = {
  profile: FixedIdentityProfile;
  groupId: string;
  onBack(): void;
  onOpenMembers(): void;
};

type GroupChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userPhotoBase64?: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type GroupChatResponse = {
  group: {
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
  canViewMembers: boolean;
  messages: GroupChatMessage[];
};

type GroupMemberPreview = {
  userId: string;
  fullName: string;
  role: 'owner' | 'admin' | 'member';
};

type GroupMembersPreviewResponse = {
  members: GroupMemberPreview[];
};

export function GroupDetailScreen({ profile, groupId, onBack, onOpenMembers }: Props) {
  const [data, setData] = useState<GroupChatResponse | null>(null);
  const [membersPreview, setMembersPreview] = useState<GroupMemberPreview[]>([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    try {
      const response = await apiGet<GroupChatResponse>(`/communities/${groupId}/chat`, profile.userId);
      setData(response);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load group.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [groupId, profile.userId]);

  useEffect(() => {
    let mounted = true;

    async function loadMembersPreview() {
      if (!data?.canViewMembers) {
        setMembersPreview([]);
        return;
      }

      try {
        const response = await apiGet<GroupMembersPreviewResponse>(`/communities/${groupId}/members`, profile.userId);
        if (mounted) {
          setMembersPreview(response.members.slice(0, 6));
        }
      } catch {
        if (mounted) {
          setMembersPreview([]);
        }
      }
    }

    void loadMembersPreview();

    return () => {
      mounted = false;
    };
  }, [data?.canViewMembers, groupId, profile.userId]);

  async function prepareImage(): Promise<string | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission is required to send images.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    const savedImage = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1280 } }],
      {
        compress: 0.45,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    return savedImage.base64 ? `data:image/jpeg;base64,${savedImage.base64}` : null;
  }

  async function handlePickPhoto() {
    const prepared = await prepareImage();
    if (prepared) {
      setImageBase64(prepared);
      setError(null);
    }
  }

  async function handleSend() {
    if (imageBase64 && imageBase64.length > 2_500_000) {
      setError('The selected photo is still too large. Choose a smaller one.');
      return;
    }

    setSending(true);
    try {
      const response = await apiPost<GroupChatMessage>(
        `/communities/${groupId}/messages`,
        { text, imageBase64 },
        profile.userId
      );
      setData((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, response]
            }
          : current
      );
      setText('');
      setImageBase64(null);
      setError(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <TopBar
        title={data?.group.name || 'Group'}
        leftActionLabel="Back"
        onLeftAction={onBack}
        rightActionLabel="Members"
        onRightAction={data?.canViewMembers ? onOpenMembers : undefined}
      />

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading group chat...</Text>
        </View>
      ) : data ? (
        <>
          <Pressable style={styles.chatHeader} onPress={() => setShowGroupInfo(true)}>
            <Text style={styles.chatTitle}>{data.group.name}</Text>
            <Text style={styles.chatMeta}>
              {data.group.membersCount} members
              {data.group.role ? ` · ${data.group.role}` : ''}
            </Text>
            {data.group.description ? <Text style={styles.chatDescription}>{data.group.description}</Text> : null}
            <Text style={styles.headerHint}>Tap group name for description and participants</Text>
          </Pressable>

          <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
            {data.messages.map((message) => (
              <View key={message.id} style={[styles.messageRow, message.isOwnMessage && styles.messageRowOwn]}>
                {!message.isOwnMessage ? (
                  message.userPhotoBase64 ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${message.userPhotoBase64}` }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{message.userName.slice(0, 1)}</Text>
                    </View>
                  )
                ) : null}
                <View style={[styles.messageBubble, message.isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
                  {!message.isOwnMessage ? <Text style={styles.senderName}>{message.userName}</Text> : null}
                  {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
                  {message.imageBase64 ? <Image source={{ uri: message.imageBase64 }} style={styles.messageImage} /> : null}
                  <Text style={styles.timestamp}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            {imageBase64 ? <Image source={{ uri: imageBase64 }} style={styles.previewImage} /> : null}
            <View style={styles.composerRow}>
              <Pressable style={styles.attachButton} onPress={handlePickPhoto}>
                <Text style={styles.attachButtonText}>Photo</Text>
              </Pressable>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write in the group"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
              />
              <Pressable style={[styles.sendButton, sending && styles.buttonDisabled]} onPress={handleSend} disabled={sending}>
                <Text style={styles.sendButtonText}>Send</Text>
              </Pressable>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </>
      ) : (
        <View style={styles.loadingBlock}>
          <Text style={styles.errorText}>{error || 'Unable to load group.'}</Text>
        </View>
      )}

      {showGroupInfo && data ? (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{data.group.name}</Text>
            <Text style={styles.sheetMeta}>
              {data.group.membersCount} members · {data.group.visibility === 'private' ? 'Private group' : 'Public group'}
            </Text>
            <Text style={styles.sheetDescription}>{data.group.description || 'No description yet.'}</Text>
            {membersPreview.length ? (
              <View style={styles.memberPreviewWrap}>
                {membersPreview.map((member) => (
                  <View key={member.userId} style={styles.memberPreviewRow}>
                    <Text style={styles.memberPreviewName}>{member.fullName}</Text>
                    <Text style={styles.memberPreviewRole}>{member.role}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {data.canViewMembers ? (
              <Pressable style={styles.primaryButton} onPress={onOpenMembers}>
                <Text style={styles.primaryButtonText}>View all participants</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondaryButton} onPress={() => setShowGroupInfo(false)}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  loadingText: {
    color: colors.textMuted
  },
  chatHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm
  },
  chatTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 20
  },
  chatMeta: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4
  },
  chatDescription: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20
  },
  headerHint: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 8
  },
  messages: {
    flex: 1
  },
  messagesContent: {
    paddingBottom: spacing.md,
    gap: spacing.sm
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm
  },
  messageRowOwn: {
    justifyContent: 'flex-end'
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D7F5EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#0D5E57',
    fontWeight: '800',
    fontSize: 12
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  ownBubble: {
    backgroundColor: '#D7F5EE'
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border
  },
  senderName: {
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 4
  },
  messageText: {
    color: colors.text,
    lineHeight: 20
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginTop: spacing.sm,
    backgroundColor: '#E5E7EB'
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right'
  },
  composer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm
  },
  attachButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff'
  },
  attachButtonText: {
    color: colors.text,
    fontWeight: '700'
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text
  },
  sendButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  previewImage: {
    width: 84,
    height: 84,
    borderRadius: 18,
    marginBottom: spacing.sm
  },
  errorText: {
    color: '#B42318',
    textAlign: 'center',
    marginTop: spacing.sm
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
    gap: spacing.sm
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800'
  },
  sheetMeta: {
    color: colors.primary,
    fontWeight: '700'
  },
  sheetDescription: {
    color: colors.textMuted,
    lineHeight: 20
  },
  memberPreviewWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs
  },
  memberPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  memberPreviewName: {
    color: colors.text,
    fontWeight: '700',
    flex: 1
  },
  memberPreviewRole: {
    color: colors.textMuted,
    textTransform: 'capitalize'
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
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
