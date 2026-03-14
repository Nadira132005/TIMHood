import React, { PropsWithChildren } from 'react';
import { ScrollView, SafeAreaView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme/tokens';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function ScreenContainer({ children, scroll = true, contentContainerStyle }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  body: {
    flex: 1,
    padding: spacing.md
  },
  scrollContent: {
    paddingBottom: spacing.lg
  }
});
