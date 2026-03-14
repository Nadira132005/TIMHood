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
import { ImageViewerModal } from '../../../shared/ui/ImageViewerModal';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';
import { toImageUri } from '../../../shared/utils/images';

type Props = {
  profile: FixedIdentityProfile;
  onBack(): void;
};

type NeighborhoodSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

type NeighborhoodChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userPhotoBase64?: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type NeighborhoodChatResponse = {
  neighborhood: NeighborhoodSummary;
  participantsCount: number;
  messages: NeighborhoodChatMessage[];
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
  fromUserId: string;
  toUserId: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type DirectChatResponse = {
  relationship: 'friends';
  messages: DirectChatMessage[];
};

export function NeighborhoodChatScreen({ profile, onBack }: Props) {
  const [data, setData] = useState<NeighborhoodChatResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<NeighborhoodChatMessage | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipResponse['status']>('none');
  const [directChat, setDirectChat] = useState<DirectChatResponse | null>(null);
  const [directChatTarget, setDirectChatTarget] = useState<NeighborhoodChatMessage | null>(null);
  const [viewerImageUri, setViewerImageUri] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('Photo');

  useEffect(() => {
    let mounted = true;

    async function loadChat() {
      setBusy(true);
      try {
        const response = await apiGet<NeighborhoodChatResponse>('/neighborhoods/my-chat', profile.userId);
        if (mounted) {
          setData(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load chat.');
        }
      } finally {
        if (mounted) {
          setBusy(false);
        }
      }
    }

    loadChat();

    return () => {
      mounted = false;
    };
  }, [profile.userId]);

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

    if (!savedImage.base64) {
      setError('Unable to prepare photo.');
      return null;
    }

    return `data:image/jpeg;base64,${savedImage.base64}`;
  }

  async function handlePickPhoto() {
    const prepared = await prepareImage();
    if (prepared) {
      setImageBase64(prepared);
      setError(null);
    }
  }

  async function handleSendNeighborhoodMessage() {
    if (imageBase64 && imageBase64.length > 2_500_000) {
      setError('The selected photo is still too large. Choose a smaller one.');
      return;
    }

    setSending(true);
    try {
      const response = await apiPost<NeighborhoodChatMessage>(
        '/neighborhoods/my-chat/messages',
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

  async function openMessageActions(message: NeighborhoodChatMessage) {
    if (message.isOwnMessage) {
      return;
    }

    setSelectedMessage(message);
    try {
      const [profileResponse, relationshipResponse] = await Promise.all([
        apiGet<PublicProfile>(`/identity/users/${message.userId}`, profile.userId),
        apiGet<RelationshipResponse>(`/social/relationships/${message.userId}`, profile.userId)
      ]);
      setPublicProfile(profileResponse);
      setRelationship(relationshipResponse.status);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load user actions.');
    }
  }

  async function handleFriendAction() {
    if (!selectedMessage) {
      return;
    }

    try {
      if (relationship === 'request_received') {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedMessage.userId}/respond`,
          { accept: true },
          profile.userId
        );
        setRelationship(response.status);
      } else if (relationship === 'none') {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedMessage.userId}`,
          {},
          profile.userId
        );
        setRelationship(response.status);
      }
    } catch (friendError) {
      setError(friendError instanceof Error ? friendError.message : 'Unable to update friendship.');
    }
  }

  async function openDirectChat() {
    if (!selectedMessage) {
      return;
    }

    try {
      const response = await apiGet<DirectChatResponse>(
        `/social/direct-chats/${selectedMessage.userId}`,
        profile.userId
      );
      setDirectChat(response);
      setDirectChatTarget(selectedMessage);
      setSelectedMessage(null);
      setPublicProfile(null);
      setRelationship('none');
      setError(null);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Unable to open private chat.');
    }
  }

  async function handleSendDirectMessage() {
    if (!directChatTarget) {
      return;
    }

    if (imageBase64 && imageBase64.length > 2_500_000) {
      setError('The selected photo is still too large. Choose a smaller one.');
      return;
    }

    setSending(true);
    try {
      const response = await apiPost<DirectChatMessage>(
        `/social/direct-chats/${directChatTarget.userId}/messages`,
        { text, imageBase64 },
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
      setText('');
      setImageBase64(null);
      setError(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send private message.');
    } finally {
      setSending(false);
    }
  }

  function closeActions() {
    setSelectedMessage(null);
    setPublicProfile(null);
    setRelationship('none');
    setError(null);
  }

  function closeDirectChat() {
    setDirectChat(null);
    setDirectChatTarget(null);
    setText('');
    setImageBase64(null);
    setError(null);
  }

  function openImageViewer(imageUri: string, title?: string) {
    setViewerImageUri(imageUri);
    setViewerTitle(title || 'Photo');
  }

  const showingDirectChat = Boolean(directChat && directChatTarget);

  return (
    <ScreenContainer scroll={false}>
      <TopBar
        title={showingDirectChat ? directChatTarget?.userName || 'Private Chat' : data?.neighborhood.name || 'Neighborhood Chat'}
        leftActionLabel="Back"
        onLeftAction={showingDirectChat ? closeDirectChat : onBack}
      />

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      ) : showingDirectChat && directChat && directChatTarget ? (
        <>
          <SectionCard title="Private Chat">
            <Text style={styles.chatTitle}>{directChatTarget.userName}</Text>
            <Text style={styles.chatMeta}>Messages are available only after both users accept.</Text>
          </SectionCard>
          <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
            {directChat.messages.map((message) => (
              <View
                key={message.id}
                style={[styles.messageBubble, message.isOwnMessage ? styles.ownBubble : styles.otherBubble]}
              >
                {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
                {message.imageBase64 ? (
                  <Pressable onPress={() => openImageViewer(message.imageBase64!, 'Private photo')}>
                    <Image source={{ uri: message.imageBase64 }} style={styles.messageImage} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <Composer
            text={text}
            imageBase64={imageBase64}
            error={error}
            sending={sending}
            onTextChange={setText}
            onPickPhoto={handlePickPhoto}
            onSend={handleSendDirectMessage}
          />
        </>
      ) : data ? (
        <>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>{data.neighborhood.name}</Text>
            <Text style={styles.chatMeta}>{data.participantsCount} neighbors</Text>
          </View>

          <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
            {data.messages.map((message) => (
              <Pressable
                key={message.id}
                onPress={() => openMessageActions(message)}
                style={[styles.messageRow, message.isOwnMessage && styles.messageRowOwn]}
              >
                {!message.isOwnMessage ? (
                  message.userPhotoBase64 ? (
                    <Image source={{ uri: toImageUri(message.userPhotoBase64)! }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{message.userName.slice(0, 1)}</Text>
                    </View>
                  )
                ) : null}
                <View style={[styles.messageBubble, message.isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
                  {!message.isOwnMessage ? <Text style={styles.senderName}>{message.userName}</Text> : null}
                  {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
                  {message.imageBase64 ? (
                    <Pressable onPress={() => openImageViewer(message.imageBase64!, message.userName)}>
                      <Image source={{ uri: message.imageBase64 }} style={styles.messageImage} />
                    </Pressable>
                  ) : null}
                  <Text style={styles.timestamp}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Composer
            text={text}
            imageBase64={imageBase64}
            error={error}
            sending={sending}
            onTextChange={setText}
            onPickPhoto={handlePickPhoto}
            onSend={handleSendNeighborhoodMessage}
          />
        </>
      ) : (
        <View style={styles.loadingBlock}>
          <Text style={styles.loadingText}>Chat unavailable.</Text>
        </View>
      )}

      {selectedMessage && publicProfile ? (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{publicProfile.fullName}</Text>
            {publicProfile.photoBase64 ? (
              <Pressable onPress={() => openImageViewer(toImageUri(publicProfile.photoBase64)!, publicProfile.fullName)}>
                <Image source={{ uri: toImageUri(publicProfile.photoBase64)! }} style={styles.profilePhoto} />
              </Pressable>
            ) : null}
            <Text style={styles.sheetText}>Age: {publicProfile.age ?? 'Unknown'}</Text>
            <Text style={styles.sheetText}>Neighborhood: {publicProfile.neighborhood || 'Unknown'}</Text>
            <Text style={styles.sheetText}>
              Last active: {publicProfile.lastSeenAt ? new Date(publicProfile.lastSeenAt).toLocaleString() : 'Unknown'}
            </Text>
            <Text style={styles.sheetBio}>{publicProfile.bio || 'No description yet.'}</Text>

            {relationship === 'friends' ? (
              <Pressable style={styles.primaryButton} onPress={openDirectChat}>
                <Text style={styles.primaryButtonText}>Open private chat</Text>
              </Pressable>
            ) : relationship === 'request_received' ? (
              <Pressable style={styles.primaryButton} onPress={handleFriendAction}>
                <Text style={styles.primaryButtonText}>Accept friend request</Text>
              </Pressable>
            ) : relationship === 'none' ? (
              <Pressable style={styles.primaryButton} onPress={handleFriendAction}>
                <Text style={styles.primaryButtonText}>Ask to become friends</Text>
              </Pressable>
            ) : (
              <SectionCard title="Private Chat">
                <Text style={styles.sheetText}>Waiting for the other user to accept the friendship request.</Text>
              </SectionCard>
            )}

            <Pressable style={styles.secondaryButton} onPress={closeActions}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ImageViewerModal
        visible={Boolean(viewerImageUri)}
        imageUri={viewerImageUri}
        title={viewerTitle}
        onClose={() => setViewerImageUri(null)}
      />
    </ScreenContainer>
  );
}

type ComposerProps = {
  text: string;
  imageBase64: string | null;
  error: string | null;
  sending: boolean;
  onTextChange(value: string): void;
  onPickPhoto(): void;
  onSend(): void;
};

function Composer({ text, imageBase64, error, sending, onTextChange, onPickPhoto, onSend }: ComposerProps) {
  return (
    <View style={styles.composer}>
      {imageBase64 ? <Image source={{ uri: imageBase64 }} style={styles.previewImage} /> : null}
      <View style={styles.composerRow}>
        <Pressable style={styles.attachButton} onPress={onPickPhoto}>
          <Text style={styles.attachButtonText}>Photo</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={onTextChange}
          placeholder="Write a message"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable style={[styles.sendButton, sending && styles.disabledButton]} onPress={onSend} disabled={sending}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
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
    fontSize: 18
  },
  chatMeta: {
    color: colors.textMuted,
    marginTop: 4
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
    alignSelf: 'flex-end',
    backgroundColor: '#D7F5EE'
  },
  otherBubble: {
    alignSelf: 'flex-start',
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.primary
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  disabledButton: {
    opacity: 0.7
  },
  previewImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
    marginBottom: spacing.sm,
    backgroundColor: '#E5E7EB'
  },
  errorText: {
    color: '#B42318',
    marginTop: spacing.sm
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm
  },
  sheetTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 20
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 36
  },
  sheetText: {
    color: colors.text,
    lineHeight: 20
  },
  sheetBio: {
    color: colors.textMuted,
    lineHeight: 22
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  secondaryButton: {
    minHeight: 48,
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
