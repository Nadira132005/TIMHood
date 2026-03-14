import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CommunitiesScreen } from '../features/communities/screens/CommunitiesScreen';
import { EventsScreen } from '../features/events/screens/EventsScreen';
import { ServicesScreen } from '../features/services/screens/ServicesScreen';
import { ProfileScreen } from '../features/profiles/screens/ProfileScreen';
import { ProofScreen } from '../features/proof/screens/ProofScreen';
import { colors, spacing } from '../shared/theme/tokens';
import { AppTab } from '../shared/types/domain';

const tabs: Array<{ key: AppTab; label: string }> = [
  { key: 'communities', label: 'Communities' },
  { key: 'events', label: 'Events' },
  { key: 'services', label: 'Services' },
  { key: 'profile', label: 'Profile' },
  { key: 'proof', label: 'Proof' }
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('communities');

  const screen = useMemo(() => {
    if (activeTab === 'communities') return <CommunitiesScreen />;
    if (activeTab === 'events') return <EventsScreen />;
    if (activeTab === 'services') return <ServicesScreen />;
    if (activeTab === 'profile') return <ProfileScreen />;
    return <ProofScreen />;
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Timhood</Text>
        <Text style={styles.subtitle}>Hackathon App Scaffold</Text>
      </View>
      <ScrollView horizontal style={styles.tabRow} contentContainerStyle={styles.tabRowContent}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.screen}>{screen}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted
  },
  tabRow: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface
  },
  tabRowContent: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm
  },
  tabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabText: {
    color: colors.text,
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#ffffff'
  },
  screen: {
    flex: 1
  }
});
