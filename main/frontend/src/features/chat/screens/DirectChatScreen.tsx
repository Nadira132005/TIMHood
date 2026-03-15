import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiGet, apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ImageViewerModal } from '../../../shared/ui/ImageViewerModal';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';

type Props = {
  profile: FixedIdentityProfile;
  targetUserId: string;
  targetUserName: string;
  onBack(): void;
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

export function DirectChatScreen({ profile, targetUserId, targetUserName, onBack }: Props) {
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [chat, setChat] = useState<DirectChatResponse | null>(null);
  const [viewerImageUri, setViewerImageUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadChat() {
      setBusy(true);
      try {
        const response = await apiGet<DirectChatResponse>(`/social/direct-chats/${targetUserId}`, profile.userId);
        if (mounted) {
          setChat(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to open private chat.');
        }
      } finally {
        if (mounted) {
          setBusy(false);
        }
      }
    }

    void loadChat();

    return () => {
      mounted = false;
    };
  }, [profile.userId, targetUserId]);

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

  async function handleSend() {
    if (imageBase64 && imageBase64.length > 2_500_000) {
      setError('The selected photo is still too large. Choose a smaller one.');
      return;
    }

    setSending(true);
    try {
      const response = await apiPost<DirectChatMessage>(
        `/social/direct-chats/${targetUserId}/messages`,
        { text, imageBase64 },
        profile.userId
      );

      setChat((current) =>
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

  return (
    <ScreenContainer scroll={false}>
      <TopBar title={targetUserName} leftActionLabel="Back" onLeftAction={onBack} />

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      ) : chat ? (
        <>
          <SectionCard title="Private Chat">
            <Text style={styles.chatTitle}>{targetUserName}</Text>
            <Text style={styles.chatMeta}>Messages are available only after both users accept.</Text>
          </SectionCard>
          <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
            {chat.messages.map((message) => (
              <View
                key={message.id}
                style={[styles.messageBubble, message.isOwnMessage ? styles.ownBubble : styles.otherBubble]}
              >
                {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
                {message.imageBase64 ? (
                  <Pressable onPress={() => setViewerImageUri(message.imageBase64 || null)}>
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
            onSend={handleSend}
          />
        </>
      ) : (
        <View style={styles.loadingBlock}>
          <Text style={styles.loadingText}>Chat unavailable.</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      )}

      <ImageViewerModal
        visible={Boolean(viewerImageUri)}
        imageUri={viewerImageUri}
        title="Private photo"
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
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  previewImage: {
    width: 92,
    height: 92,
    borderRadius: 16,
    marginBottom: spacing.sm
  },
  errorText: {
    color: '#B42318',
    marginTop: spacing.sm
  },
  disabledButton: {
    opacity: 0.7
  }
});
