"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = AppShell;
var react_1 = require("react");
var react_native_1 = require("react-native");
var CommunitiesScreen_1 = require("../features/communities/screens/CommunitiesScreen");
var EventsScreen_1 = require("../features/events/screens/EventsScreen");
var ServicesScreen_1 = require("../features/services/screens/ServicesScreen");
var ProfileScreen_1 = require("../features/profiles/screens/ProfileScreen");
var ProofScreen_1 = require("../features/proof/screens/ProofScreen");
var tokens_1 = require("../shared/theme/tokens");
var tabs = [
    { key: 'communities', label: 'Communities' },
    { key: 'events', label: 'Events' },
    { key: 'services', label: 'Services' },
    { key: 'profile', label: 'Profile' },
    { key: 'proof', label: 'Proof' }
];
function AppShell() {
    var _a = (0, react_1.useState)('communities'), activeTab = _a[0], setActiveTab = _a[1];
    var screen = (0, react_1.useMemo)(function () {
        if (activeTab === 'communities')
            return <CommunitiesScreen_1.CommunitiesScreen />;
        if (activeTab === 'events')
            return <EventsScreen_1.EventsScreen />;
        if (activeTab === 'services')
            return <ServicesScreen_1.ServicesScreen />;
        if (activeTab === 'profile')
            return <ProfileScreen_1.ProfileScreen />;
        return <ProofScreen_1.ProofScreen />;
    }, [activeTab]);
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Timhood</react_native_1.Text>
        <react_native_1.Text style={styles.subtitle}>Hackathon App Scaffold</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.ScrollView horizontal style={styles.tabRow} contentContainerStyle={styles.tabRowContent}>
        {tabs.map(function (tab) { return (<react_native_1.Pressable key={tab.key} onPress={function () { return setActiveTab(tab.key); }} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}>
            <react_native_1.Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </react_native_1.Text>
          </react_native_1.Pressable>); })}
      </react_native_1.ScrollView>
      <react_native_1.View style={styles.screen}>{screen}</react_native_1.View>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens_1.colors.bg
    },
    header: {
        paddingTop: 52,
        paddingHorizontal: tokens_1.spacing.md,
        paddingBottom: tokens_1.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: tokens_1.colors.border,
        backgroundColor: tokens_1.colors.surface
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: tokens_1.colors.text
    },
    subtitle: {
        marginTop: 4,
        color: tokens_1.colors.textMuted
    },
    tabRow: {
        maxHeight: 56,
        borderBottomWidth: 1,
        borderBottomColor: tokens_1.colors.border,
        backgroundColor: tokens_1.colors.surface
    },
    tabRowContent: {
        paddingHorizontal: tokens_1.spacing.md,
        alignItems: 'center',
        gap: tokens_1.spacing.sm
    },
    tabButton: {
        paddingVertical: tokens_1.spacing.sm,
        paddingHorizontal: tokens_1.spacing.md,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tokens_1.colors.border,
        marginVertical: tokens_1.spacing.sm
    },
    tabButtonActive: {
        backgroundColor: tokens_1.colors.primary,
        borderColor: tokens_1.colors.primary
    },
    tabText: {
        color: tokens_1.colors.text,
        fontWeight: '600'
    },
    tabTextActive: {
        color: '#ffffff'
    },
    screen: {
        flex: 1
    }
});
