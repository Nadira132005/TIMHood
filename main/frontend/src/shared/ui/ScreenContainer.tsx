import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, ScrollView, SafeAreaView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme/tokens';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function ScreenContainer({ children, scroll = true, contentContainerStyle }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true
      }),
      Animated.spring(lift, {
        toValue: 0,
        damping: 16,
        stiffness: 120,
        mass: 0.9,
        useNativeDriver: true
      })
    ]).start();
  }, [fade, lift]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.blob, styles.blobWarm]} />
      <View style={[styles.blob, styles.blobCool]} />
      <View style={[styles.blob, styles.blobSoft]} />
      {scroll ? (
        <Animated.View style={[styles.contentWrap, { opacity: fade, transform: [{ translateY: lift }] }]}>
          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      ) : (
        <Animated.View
          style={[styles.body, styles.contentWrap, contentContainerStyle, { opacity: fade, transform: [{ translateY: lift }] }]}
        >
          {children}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  contentWrap: {
    flex: 1
  },
  body: {
    flex: 1,
    padding: spacing.md
  },
  scrollContent: {
    paddingBottom: spacing.lg
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999
  },
  blobWarm: {
    width: 240,
    height: 240,
    top: -40,
    right: -80,
    backgroundColor: 'rgba(230, 141, 84, 0.24)'
  },
  blobCool: {
    width: 220,
    height: 220,
    left: -70,
    top: 180,
    backgroundColor: 'rgba(86, 186, 165, 0.18)'
  },
  blobSoft: {
    width: 260,
    height: 260,
    bottom: -100,
    right: -50,
    backgroundColor: 'rgba(241, 202, 121, 0.20)'
  }
});
