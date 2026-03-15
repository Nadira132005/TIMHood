import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AddressScreen } from "../features/address/screens/AddressScreen";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import { DirectChatScreen } from "../features/chat/screens/DirectChatScreen";
import { DashboardScreen } from "../features/dashboard/screens/DashboardScreen";
import { DiscoverGroupsScreen } from "../features/groups/screens/DiscoverGroupsScreen";
import { GroupDetailScreen } from "../features/groups/screens/GroupDetailScreen";
import { GroupEventApprovalsScreen } from "../features/groups/screens/GroupEventApprovalsScreen";
import { GroupMembersScreen } from "../features/groups/screens/GroupMembersScreen";
import { JoinedGroupsScreen } from "../features/groups/screens/JoinedGroupsScreen";
import { FriendsScreen } from "../features/social/screens/FriendsScreen";
import { RequestsScreen } from "../features/social/screens/RequestsScreen";
import { WelcomeScreen } from "../features/welcome/screens/WelcomeScreen";
import {
  clearPersistedSession,
  loadPersistedSession,
  persistSession,
} from "../shared/state/auth-storage";
import {
  FixedIdentityProfile,
  initialSessionState,
} from "../shared/state/session";
import { colors } from "../shared/theme/tokens";

type Route =
  | "dashboard"
  | "edit-address"
  | "profile"
  | "groups"
  | "joined-groups"
  | "group-detail"
  | "group-members"
  | "group-event-approvals"
  | "friends"
  | "requests"
  | "direct-chat";

type GroupSourceRoute = "groups" | "joined-groups";

export function AppShell() {
  const [session, setSession] = useState(initialSessionState);
  const [hydrating, setHydrating] = useState(true);
  const [route, setRoute] = useState<Route>("dashboard");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupSource, setSelectedGroupSource] =
    useState<GroupSourceRoute>("joined-groups");
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(
    null,
  );
  const [selectedChatUserName, setSelectedChatUserName] = useState<
    string | null
  >(null);
  const needsAddress = session.profile && !session.profile.homeAddressLabel;

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      const storedSession = await loadPersistedSession();
      if (!active) {
        return;
      }

      setSession(storedSession);
      setHydrating(false);
    }

    hydrateSession().catch((error) => {
      console.error(error);
      if (active) {
        setSession(initialSessionState);
        setHydrating(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session.profile) {
      setRoute("dashboard");
    } else if (!session.profile.homeAddressLabel) {
      setRoute("dashboard");
    }
  }, [session.profile]);

  async function handleLogin(profile: FixedIdentityProfile) {
    await persistSession(profile.userId);
    setSession({
      userId: profile.userId,
      profile,
    });
  }

  async function handleProfileUpdated(profile: FixedIdentityProfile) {
    setSession({
      userId: session.userId ?? profile.userId,
      profile,
    });
  }

  async function handleLogout() {
    await clearPersistedSession();
    setRoute("dashboard");
    setSession(initialSessionState);
  }

  if (hydrating) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {session.profile && !needsAddress ? (
        route === "profile" ? (
          <WelcomeScreen
            profile={session.profile}
            onBack={() => setRoute("dashboard")}
            onLogout={() => void handleLogout()}
            onProfileUpdated={(profile) => void handleProfileUpdated(profile)}
            onEditAddress={() => setRoute("edit-address")}
          />
        ) : route === "edit-address" ? (
          <AddressScreen
            profile={session.profile}
            onBack={() => setRoute("profile")}
            onCompleted={(profile) => {
              setRoute("dashboard");
              void handleProfileUpdated(profile);
            }}
          />
        ) : route === "groups" ? (
          <DiscoverGroupsScreen
            profile={session.profile}
            onBack={() => setRoute("dashboard")}
            onOpenGroup={(groupId) => {
              setSelectedGroupId(groupId);
              setSelectedGroupSource("groups");
              setRoute("group-detail");
            }}
          />
        ) : route === "joined-groups" ? (
          <JoinedGroupsScreen
            profile={session.profile}
            onBack={() => setRoute("dashboard")}
            onOpenGroup={(groupId) => {
              setSelectedGroupId(groupId);
              setSelectedGroupSource("joined-groups");
              setRoute("group-detail");
            }}
          />
        ) : route === "group-detail" && selectedGroupId ? (
          <GroupDetailScreen
            profile={session.profile}
            groupId={selectedGroupId}
            onBack={() => setRoute(selectedGroupSource)}
            onOpenMembers={() => setRoute("group-members")}
            onOpenEventApprovals={() => setRoute("group-event-approvals")}
            onGroupLeft={() => {
              setSelectedGroupId(null);
              setRoute("joined-groups");
            }}
            onGroupDeleted={() => {
              setSelectedGroupId(null);
              setRoute("joined-groups");
            }}
          />
        ) : route === "group-event-approvals" && selectedGroupId ? (
          <GroupEventApprovalsScreen
            profile={session.profile}
            groupId={selectedGroupId}
            onBack={() => setRoute("group-detail")}
          />
        ) : route === "group-members" && selectedGroupId ? (
          <GroupMembersScreen
            profile={session.profile}
            groupId={selectedGroupId}
            onBack={() => setRoute("group-detail")}
            onOpenChat={(userId, fullName) => {
              setSelectedChatUserId(userId);
              setSelectedChatUserName(fullName);
              setRoute("direct-chat");
            }}
          />
        ) : route === "requests" ? (
          <RequestsScreen
            profile={session.profile}
            onBack={() => setRoute("dashboard")}
          />
        ) : route === "direct-chat" &&
          selectedChatUserId &&
          selectedChatUserName ? (
          <DirectChatScreen
            profile={session.profile}
            targetUserId={selectedChatUserId}
            targetUserName={selectedChatUserName}
            onBack={() => setRoute("friends")}
          />
        ) : route === "friends" ? (
          <FriendsScreen
            profile={session.profile}
            onBack={() => setRoute("dashboard")}
            onOpenChat={(userId, fullName) => {
              setSelectedChatUserId(userId);
              setSelectedChatUserName(fullName);
              setRoute("direct-chat");
            }}
          />
        ) : (
          <DashboardScreen
            profile={session.profile}
            onOpenProfile={() => setRoute("profile")}
            onOpenNeighborhoodGroup={(groupId) => {
              setSelectedGroupId(groupId);
              setSelectedGroupSource("joined-groups");
              setRoute("group-detail");
            }}
            onOpenDiscoverGroups={() => setRoute("groups")}
            onOpenJoinedGroups={() => setRoute("joined-groups")}
            onOpenFriends={() => setRoute("friends")}
            onOpenFriendRequests={() => setRoute("requests")}
          />
        )
      ) : session.profile ? (
        <AddressScreen
          profile={session.profile}
          onBack={() => void handleLogout()}
          onCompleted={(profile) => {
            setRoute("dashboard");
            void handleProfileUpdated(profile);
          }}
        />
      ) : (
        <LoginScreen onLogin={(profile) => void handleLogin(profile)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
