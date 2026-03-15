import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { toImageUri } from '../utils/images';

const AVATAR_PALETTE = [
  { background: '#FDE68A', foreground: '#92400E' },
  { background: '#BFDBFE', foreground: '#1D4ED8' },
  { background: '#C7D2FE', foreground: '#4338CA' },
  { background: '#FBCFE8', foreground: '#BE185D' },
  { background: '#BBF7D0', foreground: '#166534' },
  { background: '#DDD6FE', foreground: '#6D28D9' },
  { background: '#FED7AA', foreground: '#C2410C' },
  { background: '#A7F3D0', foreground: '#047857' }
];

function hashValue(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getInitials(label: string) {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return '?';
  }

  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

type Props = {
  photoBase64?: string | null;
  label: string;
  size?: number;
};

export function UserAvatar({ photoBase64, label, size = 40 }: Props) {
  const imageUri = toImageUri(photoBase64);
  const isSvgAvatar = imageUri?.startsWith('data:image/svg+xml') ?? false;

  if (imageUri && !isSvgAvatar) {
    return <Image source={{ uri: imageUri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  const palette = AVATAR_PALETTE[hashValue(label || '?') % AVATAR_PALETTE.length];
  const initials = getInitials(label);

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.background
        }
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            color: palette.foreground,
            fontSize: Math.max(12, Math.round(size * 0.34))
          }
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E5E7EB'
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  initials: {
    fontWeight: '800'
  }
});
