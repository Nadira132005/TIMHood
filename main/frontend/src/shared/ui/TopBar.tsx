import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';

type Props = {
  title: string;
  leftActionLabel?: string;
  onLeftAction?(): void;
  rightActionLabel?: string;
  onRightAction?(): void;
};

export function TopBar({ title, leftActionLabel, onLeftAction, rightActionLabel, onRightAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {leftActionLabel && onLeftAction ? (
          <Pressable style={styles.button} onPress={onLeftAction}>
            <Text style={styles.buttonText}>{leftActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.side, styles.sideRight]}>
        {rightActionLabel && onRightAction ? (
          <Pressable style={styles.button} onPress={onRightAction}>
            <Text style={styles.buttonText}>{rightActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 40
  },
  side: {
    width: 88
  },
  sideRight: {
    alignItems: 'flex-end'
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '800',
    fontSize: 16
  },
  button: {
    paddingVertical: 8
  },
  buttonText: {
    color: colors.primary,
    fontWeight: '700'
  }
});
