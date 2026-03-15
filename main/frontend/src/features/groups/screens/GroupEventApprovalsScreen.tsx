import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { apiGet, apiPost } from "../../../shared/api/client";
import { FixedIdentityProfile } from "../../../shared/state/session";
import { colors, spacing } from "../../../shared/theme/tokens";
import { ScreenContainer } from "../../../shared/ui/ScreenContainer";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { TopBar } from "../../../shared/ui/TopBar";
import { UserAvatar } from "../../../shared/ui/UserAvatar";

type Props = {
  profile: FixedIdentityProfile;
  groupId: string;
  onBack(): void;
};

type GroupEventsApprovalResponse = {
  group: {
    id: string;
    name: string;
    role?: string;
  };
  requesterRole: "owner" | "admin" | "member";
  pendingEvents: Array<{
    id: string;
    threadId: string;
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    locationLabel: string;
    createdAt: string;
    createdBy: {
      userId: string;
      userName: string;
      userPhotoBase64?: string;
    };
  }>;
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
  status: "self" | "friends" | "request_sent" | "request_received" | "none";
};

type PendingEvent = GroupEventsApprovalResponse["pendingEvents"][number];

export function GroupEventApprovalsScreen({
  profile,
  groupId,
  onBack,
}: Props) {
  const [data, setData] = useState<GroupEventsApprovalResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [relationship, setRelationship] =
    useState<RelationshipResponse["status"]>("none");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setBusy(true);
      try {
        const response = await apiGet<GroupEventsApprovalResponse>(
          `/communities/${groupId}/members`,
          profile.userId,
        );
        if (mounted) {
          setData(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load pending events.",
          );
        }
      } finally {
        if (mounted) {
          setBusy(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [groupId, profile.userId]);

  async function reload() {
    const response = await apiGet<GroupEventsApprovalResponse>(
      `/communities/${groupId}/members`,
      profile.userId,
    );
    setData(response);
  }

  async function handleEventDecision(eventId: string, approve: boolean) {
    setSubmitting(eventId);
    try {
      await apiPost(
        `/communities/${groupId}/events/${eventId}/${approve ? "approve" : "reject"}`,
        {},
        profile.userId,
      );
      await reload();
      setError(null);
      if (selectedEvent?.id === eventId) {
        closeCreatorProfile();
      }
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Unable to update event moderation.",
      );
    } finally {
      setSubmitting(null);
    }
  }

  async function openCreatorProfile(event: PendingEvent) {
    if (event.createdBy.userId === profile.userId) {
      return;
    }

    setSelectedEvent(event);
    try {
      const [profileResponse, relationshipResponse] = await Promise.all([
        apiGet<PublicProfile>(
          `/identity/users/${event.createdBy.userId}`,
          profile.userId,
        ),
        apiGet<RelationshipResponse>(
          `/social/relationships/${event.createdBy.userId}`,
          profile.userId,
        ),
      ]);
      setPublicProfile(profileResponse);
      setRelationship(relationshipResponse.status);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load creator profile.",
      );
    }
  }

  async function handleFriendAction() {
    if (!selectedEvent) {
      return;
    }

    try {
      if (relationship === "request_received") {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedEvent.createdBy.userId}/respond`,
          { accept: true },
          profile.userId,
        );
        setRelationship(response.status);
      } else if (relationship === "none") {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedEvent.createdBy.userId}`,
          {},
          profile.userId,
        );
        setRelationship(response.status);
      }
      setError(null);
    } catch (friendError) {
      setError(
        friendError instanceof Error
          ? friendError.message
          : "Unable to update friendship.",
      );
    }
  }

  function closeCreatorProfile() {
    setSelectedEvent(null);
    setPublicProfile(null);
    setRelationship("none");
  }

  const canManage = data?.requesterRole === "owner" || data?.requesterRole === "admin";

  return (
    <ScreenContainer>
      <TopBar
        title="Approve Events"
        leftActionLabel="Back"
        onLeftAction={onBack}
      />

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading pending events...</Text>
        </View>
      ) : error && !data ? (
        <SectionCard title="Events Error">
          <Text style={styles.bodyText}>{error}</Text>
        </SectionCard>
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>Moderation</Text>
            <Text style={styles.heroTitle}>{data.group.name}</Text>
            <Text style={styles.heroSubtitle}>
              {canManage
                ? `${data.pendingEvents.length} pending event${
                    data.pendingEvents.length === 1 ? "" : "s"
                  }`
                : "Only admins can moderate events"}
            </Text>
          </View>

          {canManage ? (
            <SectionCard title="Pending Events">
              {data.pendingEvents.length ? (
                data.pendingEvents.map((event) => (
                  <View key={event.id} style={styles.pendingEventRow}>
                    <View style={styles.pendingEventHeader}>
                      <Pressable
                        style={styles.creatorRow}
                        onPress={() => void openCreatorProfile(event)}
                      >
                        <UserAvatar
                          photoBase64={event.createdBy.userPhotoBase64}
                          label={event.createdBy.userName}
                          size={40}
                        />
                        <View style={styles.pendingEventCopy}>
                          <Text style={styles.memberName}>{event.title}</Text>
                          <Text style={styles.memberMeta}>
                            By {event.createdBy.userName}
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                    <Text style={styles.bodyText}>
                      {new Date(event.startAt).toLocaleString()} -{" "}
                      {new Date(event.endAt).toLocaleString()}
                    </Text>
                    <Text style={styles.bodyText}>
                      Location: {event.locationLabel}
                    </Text>
                    {event.description ? (
                      <Text style={styles.bodyText}>{event.description}</Text>
                    ) : null}
                    <View style={styles.pendingEventActions}>
                      <Pressable
                        style={[
                          styles.actionButton,
                          submitting === event.id && styles.buttonDisabled,
                        ]}
                        onPress={() => void handleEventDecision(event.id, true)}
                        disabled={submitting === event.id}
                      >
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.rejectButton,
                          submitting === event.id && styles.buttonDisabled,
                        ]}
                        onPress={() => void handleEventDecision(event.id, false)}
                        disabled={submitting === event.id}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.bodyText}>No pending events right now.</Text>
              )}
            </SectionCard>
          ) : (
            <SectionCard title="Access">
              <Text style={styles.bodyText}>
                You do not have permission to approve events in this group.
              </Text>
            </SectionCard>
          )}

          {error ? (
            <SectionCard title="Status">
              <Text style={styles.bodyText}>{error}</Text>
            </SectionCard>
          ) : null}
        </ScrollView>
      ) : null}

      {selectedEvent && publicProfile ? (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{publicProfile.fullName}</Text>
            <UserAvatar
              photoBase64={publicProfile.photoBase64}
              label={publicProfile.fullName}
              size={72}
            />
            {typeof publicProfile.age === "number" ? (
              <Text style={styles.sheetText}>Age: {publicProfile.age}</Text>
            ) : null}
            <Text style={styles.sheetText}>
              Neighborhood: {publicProfile.neighborhood || "Unknown"}
            </Text>
            <Text style={styles.sheetText}>
              Last active:{" "}
              {publicProfile.lastSeenAt
                ? new Date(publicProfile.lastSeenAt).toLocaleString()
                : "Unknown"}
            </Text>
            <Text style={styles.bodyText}>
              {publicProfile.bio || "No description yet."}
            </Text>

            {relationship === "request_received" ? (
              <Pressable style={styles.actionPrimaryButton} onPress={handleFriendAction}>
                <Text style={styles.actionPrimaryButtonText}>Accept friend request</Text>
              </Pressable>
            ) : relationship === "none" ? (
              <Pressable style={styles.actionPrimaryButton} onPress={handleFriendAction}>
                <Text style={styles.actionPrimaryButtonText}>Send friend request</Text>
              </Pressable>
            ) : (
              <Text style={styles.pendingText}>
                {relationship === "friends"
                  ? "You are already friends."
                  : relationship === "request_sent"
                    ? "Friend request already sent."
                    : "This is your own member card."}
              </Text>
            )}

            <Pressable style={styles.closeButton} onPress={closeCreatorProfile}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#0D5E57",
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroKicker: {
    color: "#9AE6D8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: spacing.xs,
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 28,
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    color: "#D7F5EE",
    lineHeight: 22,
  },
  loadingBlock: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
  },
  pendingEventRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  pendingEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  creatorRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pendingEventCopy: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  memberMeta: {
    color: colors.primary,
    fontWeight: "700",
  },
  bodyText: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  pendingEventActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  rejectButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#B42318",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 18, 32, 0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: "85%",
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  sheetText: {
    color: colors.primary,
    fontWeight: "700",
  },
  actionPrimaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  pendingText: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  closeButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
});
