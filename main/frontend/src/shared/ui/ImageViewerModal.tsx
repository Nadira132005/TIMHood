import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';

type Props = {
  visible: boolean;
  imageUri?: string | null;
  title?: string;
  onClose(): void;
};

export function ImageViewerModal({ visible, imageUri, title, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>{title || 'Photo'}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.viewer}
          contentContainerStyle={styles.viewerContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
        >
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" /> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.96)'
  },
  header: {
    paddingTop: spacing.lg * 2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18
  },
  closeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  viewer: {
    flex: 1
  },
  viewerContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg
  },
  image: {
    width: '100%',
    height: '100%'
  }
});
