import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker, Polygon } from "react-native-maps";

import { apiDelete, apiGet, apiPost } from "../../../shared/api/client";
import { FixedIdentityProfile } from "../../../shared/state/session";
import { colors, spacing } from "../../../shared/theme/tokens";
import { ScreenContainer } from "../../../shared/ui/ScreenContainer";
import { ImageViewerModal } from "../../../shared/ui/ImageViewerModal";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { TopBar } from "../../../shared/ui/TopBar";
import { UserAvatar } from "../../../shared/ui/UserAvatar";

type Props = {
  profile: FixedIdentityProfile;
  groupId: string;
  onBack(): void;
  onOpenMembers(): void;
  onOpenEventApprovals(): void;
  onGroupLeft(): void;
  onGroupDeleted(): void;
};

type GroupChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userPhotoBase64?: string;
  messageType: "text" | "event";
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
  approvalStatus?: "approved";
  event?: {
    eventId: string;
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    locationLabel: string;
    attendees: Array<{
      userId: string;
      userName: string;
      userPhotoBase64?: string;
      respondedAt: string;
    }>;
    attendeesCount: number;
    isAttending: boolean;
  };
};

type GroupChatResponse = {
  group: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    membersCount: number;
    role?: string;
    visibility: "public" | "private";
    groupKind: "standard" | "custom";
    neighborhoodName?: string;
    canDelete?: boolean;
    canLeave?: boolean;
  };
  canViewMembers: boolean;
  eventShareOptions: {
    targetGroups: Array<{
      id: string;
      name: string;
      neighborhoodName?: string;
    }>;
  };
  messages: GroupChatMessage[];
};

type GroupMemberPreview = {
  userId: string;
  fullName: string;
  role: "owner" | "admin" | "member";
};

type GroupMembersPreviewResponse = {
  members: GroupMemberPreview[];
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

type NeighborhoodOption = {
  id: string;
  name: string;
  slug: string;
  description: string;
  mapTop: number;
  mapLeft: number;
  mapWidth: number;
  mapHeight: number;
  polygons: Array<Array<[number, number]>>;
  center: [number, number];
};

const TIMISOARA_REGION = {
  latitude: 45.7489,
  longitude: 21.2087,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

const MAP_PALETTE = [
  "#D66A3D",
  "#0F8C7C",
  "#2F80ED",
  "#E2A93B",
  "#9B51E0",
  "#27AE60",
  "#EB5757",
  "#56CCF2",
];

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function colorForNeighborhood(name: string) {
  const hash = Array.from(name).reduce(
    (accumulator, char) => accumulator + char.charCodeAt(0),
    0,
  );
  return MAP_PALETTE[hash % MAP_PALETTE.length];
}

function neighborhoodCoordinates(neighborhood: NeighborhoodOption) {
  return neighborhood.polygons.flatMap((polygon) =>
    polygon.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
  );
}

function pointIsInsidePolygon(
  point: [number, number],
  polygon: Array<[number, number]>,
) {
  const [longitude, latitude] = point;
  let inside = false;

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const [currentLongitude, currentLatitude] = polygon[index];
    const [previousLongitude, previousLatitude] = polygon[previous];

    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function findNeighborhoodForPoint(
  point: [number, number],
  neighborhoods: NeighborhoodOption[],
) {
  return (
    neighborhoods.find((neighborhood) =>
      neighborhood.polygons.some((polygon) =>
        pointIsInsidePolygon(point, polygon),
      ),
    ) || null
  );
}

function normalizePointCoordinates(
  value: [number, number] | number[] | null | undefined,
): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

export function GroupDetailScreen({
  profile,
  groupId,
  onBack,
  onOpenMembers,
  onOpenEventApprovals,
  onGroupLeft,
  onGroupDeleted,
}: Props) {
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const eventMapRef = useRef<MapView | null>(null);
  const { width } = useWindowDimensions();
  const [data, setData] = useState<GroupChatResponse | null>(null);
  const [membersPreview, setMembersPreview] = useState<GroupMemberPreview[]>(
    [],
  );
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [viewerImageUri, setViewerImageUri] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("Photo");
  const [showEventComposer, setShowEventComposer] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<GroupChatMessage | null>(
    null,
  );
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [relationship, setRelationship] =
    useState<RelationshipResponse["status"]>("none");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartAt, setEventStartAt] = useState<Date | null>(null);
  const [eventEndAt, setEventEndAt] = useState<Date | null>(null);
  const [eventLocationLabel, setEventLocationLabel] = useState(
    profile.homeAddressLabel ?? "",
  );
  const [eventLocationPoint, setEventLocationPoint] = useState<
    [number, number] | null
  >(null);
  const [eventResolutionMessage, setEventResolutionMessage] = useState<
    string | null
  >(null);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(
    null,
  );
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [selectedEventNeighborhood, setSelectedEventNeighborhood] =
    useState("");

  const sortedNeighborhoods = [...neighborhoods].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const highlightedEventNeighborhood =
    sortedNeighborhoods.find(
      (item) => item.name === selectedEventNeighborhood,
    ) || null;
  const eventMapCoordinates = useMemo(
    () =>
      neighborhoods.flatMap((neighborhood) =>
        neighborhoodCoordinates(neighborhood),
      ),
    [neighborhoods],
  );
  const eventMapHeight = Math.max(260, (width - 64) * 0.82);
  const visibleTargetGroups = useMemo(() => {
    if (!data?.eventShareOptions.targetGroups.length || !selectedEventNeighborhood) {
      return [];
    }

    return data.eventShareOptions.targetGroups.filter(
      (group) => group.neighborhoodName === selectedEventNeighborhood,
    );
  }, [data?.eventShareOptions.targetGroups, selectedEventNeighborhood]);

  async function load() {
    setBusy(true);
    try {
      const response = await apiGet<GroupChatResponse>(
        `/communities/${groupId}/chat`,
        profile.userId,
      );
      setData(response);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load group.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [groupId, profile.userId]);

  useEffect(() => {
    if (!data?.messages.length) {
      return;
    }

    const timer = setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }, 0);

    return () => clearTimeout(timer);
  }, [data?.messages.length]);

  useEffect(() => {
    let mounted = true;

    async function loadMembersPreview() {
      if (!data?.canViewMembers) {
        setMembersPreview([]);
        return;
      }

      try {
        const response = await apiGet<GroupMembersPreviewResponse>(
          `/communities/${groupId}/members`,
          profile.userId,
        );
        if (mounted) {
          setMembersPreview(response.members.slice(0, 6));
        }
      } catch {
        if (mounted) {
          setMembersPreview([]);
        }
      }
    }

    void loadMembersPreview();

    return () => {
      mounted = false;
    };
  }, [data?.canViewMembers, groupId, profile.userId]);

  useEffect(() => {
    if (!showEventComposer) {
      return;
    }

    let mounted = true;

    void (async () => {
      setLoadingNeighborhoods(true);
      try {
        const response = await apiGet<NeighborhoodOption[]>("/neighborhoods");
        if (mounted) {
          setNeighborhoods(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load neighborhoods.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingNeighborhoods(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [showEventComposer]);

  useEffect(() => {
    if (
      !eventMapRef.current ||
      eventMapCoordinates.length === 0 ||
      !showEventComposer
    ) {
      return;
    }

    requestAnimationFrame(() => {
      eventMapRef.current?.fitToCoordinates(eventMapCoordinates, {
        edgePadding: {
          top: 48,
          right: 48,
          bottom: 48,
          left: 48,
        },
        animated: true,
      });
    });
  }, [eventMapCoordinates, showEventComposer]);

  useEffect(() => {
    if (
      !eventMapRef.current ||
      !highlightedEventNeighborhood ||
      !showEventComposer
    ) {
      return;
    }

    const coordinates = neighborhoodCoordinates(highlightedEventNeighborhood);
    if (eventLocationPoint) {
      coordinates.push({
        latitude: eventLocationPoint[1],
        longitude: eventLocationPoint[0],
      });
    }

    requestAnimationFrame(() => {
      eventMapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 48,
          right: 48,
          bottom: 48,
          left: 48,
        },
        animated: true,
      });
    });
  }, [eventLocationPoint, highlightedEventNeighborhood, showEventComposer]);

  useEffect(() => {
    if (!targetGroupId) {
      return;
    }

    if (!visibleTargetGroups.some((group) => group.id === targetGroupId)) {
      setTargetGroupId(null);
    }
  }, [targetGroupId, visibleTargetGroups]);

  async function prepareImage(): Promise<string | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo permission is required to send images.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
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
        base64: true,
      },
    );

    return savedImage.base64
      ? `data:image/jpeg;base64,${savedImage.base64}`
      : null;
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
      setError("The selected photo is still too large. Choose a smaller one.");
      return;
    }

    setSending(true);
    try {
      const response = await apiPost<GroupChatMessage>(
        `/communities/${groupId}/messages`,
        { text, imageBase64 },
        profile.userId,
      );
      setData((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, response],
            }
          : current,
      );
      setText("");
      setImageBase64(null);
      setError(null);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleResolveEventLocation() {
    const trimmedAddress = eventLocationLabel.trim();
    if (!trimmedAddress) {
      setError("Enter the event location first.");
      return;
    }

    setSubmittingEvent(true);
    try {
      const response = await apiPost<{
        neighborhood: string | null;
        location: {
          type: "Point";
          coordinates: [number, number];
        } | null;
        resolutionMode: "geocoded" | "outside_dataset" | "not_found";
      }>(
        "/neighborhoods/resolve-address",
        { addressLabel: trimmedAddress },
        profile.userId,
      );

      const normalizedPoint = normalizePointCoordinates(
        response.location?.coordinates,
      );
      setEventLocationPoint(normalizedPoint);
      if (normalizedPoint) {
        focusEventMapOnPoint(normalizedPoint);
      }
      console.log({ normalizedPoint });
      if (response.resolutionMode === "geocoded" && response.neighborhood) {
        setSelectedEventNeighborhood(response.neighborhood);
        setEventResolutionMessage(
          `Location matched to ${response.neighborhood}.`,
        );
      } else if (response.resolutionMode === "outside_dataset") {
        setSelectedEventNeighborhood("");
        setEventResolutionMessage(
          "Location found outside imported neighborhood polygons.",
        );
      } else {
        setSelectedEventNeighborhood("");
        setEventResolutionMessage(
          "Location was not matched precisely, but you can still send the event.",
        );
      }
      setError(null);
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "Unable to resolve event location.",
      );
    } finally {
      setSubmittingEvent(false);
    }
  }

  function resetEventComposer() {
    setEventTitle("");
    setEventDescription("");
    setEventStartAt(null);
    setEventEndAt(null);
    setEventLocationLabel(profile.homeAddressLabel ?? "");
    setEventLocationPoint(null);
    setEventResolutionMessage(null);
    setSelectedEventNeighborhood("");
    setTargetGroupId(null);
    setPickerTarget(null);
    setPickerMode("date");
  }

  function handleEventMapPress(latitude: number, longitude: number) {
    const nextLocation: [number, number] = [longitude, latitude];
    const matchedNeighborhood = findNeighborhoodForPoint(
      nextLocation,
      sortedNeighborhoods,
    );

    setEventLocationPoint(nextLocation);
    focusEventMapOnPoint(nextLocation);
    if (!matchedNeighborhood) {
      setSelectedEventNeighborhood("");
      setEventResolutionMessage(
        "That pin is outside the supported neighborhood polygons. Drop it inside a highlighted area.",
      );
      return;
    }

    setSelectedEventNeighborhood(matchedNeighborhood.name);
    setEventResolutionMessage(
      `Map pin matched to ${matchedNeighborhood.name}.`,
    );
  }

  function formatEventDate(value: Date | null) {
    if (!value) {
      return "Choose date and time";
    }

    return value.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatEventCoordinates(point: [number, number] | null) {
    if (!point) {
      return "Coordinates to send: none";
    }

    return `Coordinates to send: ${point[0].toFixed(6)}, ${point[1].toFixed(6)}`;
  }

  function openPicker(target: "start" | "end") {
    setPickerTarget(target);
    setPickerMode("date");
  }

  function focusEventMapOnPoint(point: [number, number]) {
    requestAnimationFrame(() => {
      eventMapRef.current?.animateToRegion(
        {
          latitude: point[1],
          longitude: point[0],
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        300,
      );
    });
  }

  function handlePickerChange(_event: unknown, selectedDate?: Date) {
    if (!pickerTarget) {
      return;
    }

    if (!selectedDate) {
      setPickerTarget(null);
      setPickerMode("date");
      return;
    }

    const currentValue = pickerTarget === "start" ? eventStartAt : eventEndAt;
    const merged = new Date(currentValue ?? new Date());
    merged.setFullYear(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
    );

    if (pickerMode === "date") {
      if (Platform.OS === "android") {
        if (pickerTarget === "start") {
          setEventStartAt(merged);
        } else {
          setEventEndAt(merged);
        }
        setPickerMode("time");
        return;
      }

      if (pickerTarget === "start") {
        setEventStartAt(merged);
      } else {
        setEventEndAt(merged);
      }
      setPickerMode("time");
      return;
    }

    merged.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    if (pickerTarget === "start") {
      setEventStartAt(merged);
    } else {
      setEventEndAt(merged);
    }

    setPickerTarget(null);
    setPickerMode("date");
  }

  async function handleCreateEvent() {
    setSubmittingEvent(true);
    try {
      if (!eventLocationPoint) {
        throw new Error(
          "Choose the event location on the map or resolve it from the street first.",
        );
      }

      await apiPost(
        `/communities/${groupId}/events`,
        {
          title: eventTitle,
          description: eventDescription,
          startAt: eventStartAt?.toISOString(),
          endAt: eventEndAt?.toISOString(),
          locationLabel: eventLocationLabel,
          location: eventLocationPoint
            ? {
                type: "Point",
                coordinates: eventLocationPoint,
              }
            : undefined,
          targetGroupId: targetGroupId || undefined,
        },
        profile.userId,
      );
      resetEventComposer();
      setShowEventComposer(false);
      await load();
      setError(null);
      Alert.alert(
        "Event sent",
        "The event was submitted to the selected groups. It will appear in feeds after admin approval.",
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create event.",
      );
    } finally {
      setSubmittingEvent(false);
    }
  }

  async function handleToggleAttendance(messageId: string) {
    setTogglingEventId(messageId);
    try {
      await apiPost(
        `/communities/${groupId}/events/${messageId}/attendance`,
        {},
        profile.userId,
      );
      await load();
      setError(null);
    } catch (attendanceError) {
      setError(
        attendanceError instanceof Error
          ? attendanceError.message
          : "Unable to update attendance.",
      );
    } finally {
      setTogglingEventId(null);
    }
  }

  async function openMessageActions(message: GroupChatMessage) {
    if (message.isOwnMessage) {
      return;
    }

    setSelectedMessage(message);
    try {
      const [profileResponse, relationshipResponse] = await Promise.all([
        apiGet<PublicProfile>(`/identity/users/${message.userId}`, profile.userId),
        apiGet<RelationshipResponse>(
          `/social/relationships/${message.userId}`,
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
          : "Unable to load user profile.",
      );
    }
  }

  async function handleFriendAction() {
    if (!selectedMessage) {
      return;
    }

    try {
      if (relationship === "request_received") {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedMessage.userId}/respond`,
          { accept: true },
          profile.userId,
        );
        setRelationship(response.status);
      } else if (relationship === "none") {
        const response = await apiPost<RelationshipResponse>(
          `/social/friend-requests/${selectedMessage.userId}`,
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

  function closeMessageActions() {
    setSelectedMessage(null);
    setPublicProfile(null);
    setRelationship("none");
  }

  async function confirmLeave() {
    Alert.alert("Leave group", "Do you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await apiPost(`/communities/${groupId}/leave`, {}, profile.userId);
            onGroupLeft();
          } catch (leaveError) {
            setError(
              leaveError instanceof Error
                ? leaveError.message
                : "Unable to leave group.",
            );
          }
        },
      },
    ]);
  }

  async function confirmDelete() {
    Alert.alert(
      "Delete group",
      "This will remove the group for everyone. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiDelete(`/communities/${groupId}`, profile.userId);
              onGroupDeleted();
            } catch (deleteError) {
              setError(
                deleteError instanceof Error
                  ? deleteError.message
                  : "Unable to delete group.",
              );
            }
          },
        },
      ],
    );
  }

  function openImageViewer(imageUri: string, title?: string) {
    setViewerImageUri(imageUri);
    setViewerTitle(title || "Photo");
  }

  return (
    <ScreenContainer scroll={false}>
      <TopBar
        title={data?.group.name || "Group"}
        leftActionLabel="Back"
        onLeftAction={onBack}
        rightActionLabel="Members"
        onRightAction={data?.canViewMembers ? onOpenMembers : undefined}
      />

      {busy ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading group chat...</Text>
        </View>
      ) : data ? (
        <>
          <Pressable
            style={styles.chatHeader}
            onPress={() => setShowGroupInfo(true)}
          >
            <Text style={styles.chatTitle}>{data.group.name}</Text>
            <Text style={styles.chatMeta}>
              {data.group.membersCount} members
              {data.group.role ? ` · ${data.group.role}` : ""}
            </Text>
            {data.group.description ? (
              <Text style={styles.chatDescription}>
                {data.group.description}
              </Text>
            ) : null}
            <Text style={styles.headerHint}>
              Tap group name for description and participants
            </Text>
          </Pressable>

          <Pressable
            style={styles.eventLaunchButton}
            onPress={() => setShowEventComposer(true)}
          >
            <Text style={styles.eventLaunchButtonText}>Create event</Text>
          </Pressable>
          {data.group.role === "owner" || data.group.role === "admin" ? (
            <Pressable
              style={styles.eventReviewButton}
              onPress={onOpenEventApprovals}
            >
              <Text style={styles.eventReviewButtonText}>Review events</Text>
            </Pressable>
          ) : null}

          <ScrollView
            ref={messagesScrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() =>
              messagesScrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {data.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.isOwnMessage && styles.messageRowOwn,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isOwnMessage
                      ? styles.ownBubble
                      : styles.otherBubble,
                  ]}
                >
                  {!message.isOwnMessage ? (
                    <Pressable
                      style={styles.senderHeader}
                      onPress={() => void openMessageActions(message)}
                    >
                      <UserAvatar
                        photoBase64={message.userPhotoBase64}
                        label={message.userName}
                        size={28}
                      />
                      <Text style={styles.senderName}>{message.userName}</Text>
                    </Pressable>
                  ) : null}
                  {message.messageType === "event" && message.event ? (
                    <View style={styles.eventCard}>
                      <View style={styles.eventTagRow}>
                        <Text style={styles.eventTag}>Approved</Text>
                        <Text style={styles.eventTime}>
                          {new Date(message.event.startAt).toLocaleString()} -{" "}
                          {new Date(message.event.endAt).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.eventTitle}>
                        {message.event.title}
                      </Text>
                      {message.event.description ? (
                        <Text style={styles.messageText}>
                          {message.event.description}
                        </Text>
                      ) : null}
                      <Text style={styles.eventLocation}>
                        Location: {message.event.locationLabel}
                      </Text>
                      <Text style={styles.eventLocation}>
                        Attendees: {message.event.attendeesCount}
                      </Text>
                      {message.event.attendees.length ? (
                        <Text style={styles.attendeeNames}>
                          {message.event.attendees
                            .map((attendee) => attendee.userName)
                            .join(", ")}
                        </Text>
                      ) : null}
                      <Pressable
                        style={[
                          styles.attendButton,
                          togglingEventId === message.id &&
                            styles.buttonDisabled,
                        ]}
                        onPress={() => handleToggleAttendance(message.id)}
                        disabled={togglingEventId === message.id}
                      >
                        <Text style={styles.attendButtonText}>
                          {message.event.isAttending ? "Attending" : "Attend"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {message.messageType === "text" && message.text ? (
                    <Text style={styles.messageText}>{message.text}</Text>
                  ) : null}
                  {message.messageType === "text" && message.imageBase64 ? (
                    <Pressable
                      onPress={() =>
                        openImageViewer(message.imageBase64!, message.userName)
                      }
                    >
                      <Image
                        source={{ uri: message.imageBase64 }}
                        style={styles.messageImage}
                      />
                    </Pressable>
                  ) : null}
                  <Text style={styles.timestamp}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            {imageBase64 ? (
              <Image
                source={{ uri: imageBase64 }}
                style={styles.previewImage}
              />
            ) : null}
            <View style={styles.composerRow}>
              <Pressable style={styles.attachButton} onPress={handlePickPhoto}>
                <Text style={styles.attachButtonText}>Photo</Text>
              </Pressable>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write in the group"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
              />
              <Pressable
                style={[styles.sendButton, sending && styles.buttonDisabled]}
                onPress={handleSend}
                disabled={sending}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </Pressable>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </>
      ) : (
        <View style={styles.loadingBlock}>
          <Text style={styles.errorText}>
            {error || "Unable to load group."}
          </Text>
        </View>
      )}

      {showGroupInfo && data ? (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{data.group.name}</Text>
            <Text style={styles.sheetMeta}>
              {data.group.membersCount} members ·{" "}
              {data.group.visibility === "private"
                ? "Private group"
                : "Public group"}
            </Text>
            <Text style={styles.sheetDescription}>
              {data.group.description || "No description yet."}
            </Text>
            {membersPreview.length ? (
              <View style={styles.memberPreviewWrap}>
                {membersPreview.map((member) => (
                  <View key={member.userId} style={styles.memberPreviewRow}>
                    <Text style={styles.memberPreviewName}>
                      {member.fullName}
                    </Text>
                    <Text style={styles.memberPreviewRole}>{member.role}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {data.canViewMembers ? (
              <Pressable style={styles.primaryButton} onPress={onOpenMembers}>
                <Text style={styles.primaryButtonText}>
                  View all participants
                </Text>
              </Pressable>
            ) : null}
            {data.group.canLeave ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => void confirmLeave()}
              >
                <Text style={styles.secondaryButtonText}>Leave group</Text>
              </Pressable>
            ) : null}
            {data.group.canDelete ? (
              <Pressable
                style={styles.dangerButton}
                onPress={() => void confirmDelete()}
              >
                <Text style={styles.dangerButtonText}>Delete group</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setShowGroupInfo(false)}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {selectedMessage && publicProfile ? (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{publicProfile.fullName}</Text>
            <UserAvatar
              photoBase64={publicProfile.photoBase64}
              label={publicProfile.fullName}
              size={72}
            />
            {typeof publicProfile.age === "number" ? (
              <Text style={styles.sheetDescription}>
                Age: {publicProfile.age}
              </Text>
            ) : null}
            <Text style={styles.sheetDescription}>
              Neighborhood: {publicProfile.neighborhood || "Unknown"}
            </Text>
            <Text style={styles.sheetDescription}>
              Last active:{" "}
              {publicProfile.lastSeenAt
                ? new Date(publicProfile.lastSeenAt).toLocaleString()
                : "Unknown"}
            </Text>
            <Text style={styles.bodyInfo}>
              {publicProfile.bio || "No description yet."}
            </Text>

            {relationship === "request_received" ? (
              <Pressable style={styles.primaryButton} onPress={handleFriendAction}>
                <Text style={styles.primaryButtonText}>Accept friend request</Text>
              </Pressable>
            ) : relationship === "none" ? (
              <Pressable style={styles.primaryButton} onPress={handleFriendAction}>
                <Text style={styles.primaryButtonText}>Send friend request</Text>
              </Pressable>
            ) : relationship === "friends" ? (
              <SectionCard title="Connection">
                <Text style={styles.bodyInfo}>You are already friends.</Text>
              </SectionCard>
            ) : relationship === "request_sent" ? (
              <SectionCard title="Connection">
                <Text style={styles.bodyInfo}>Friend request already sent.</Text>
              </SectionCard>
            ) : null}

            <Pressable
              style={styles.secondaryButton}
              onPress={closeMessageActions}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showEventComposer && data ? (
        <View style={styles.overlay}>
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.eventSheetContent}
          >
            <Text style={styles.sheetTitle}>Create Event</Text>
            <Text style={styles.sheetDescription}>
              Choose the event schedule with the native date picker.
            </Text>
            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Title"
              placeholderTextColor={colors.textMuted}
              style={styles.modalInput}
            />
            <TextInput
              value={eventDescription}
              onChangeText={setEventDescription}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              style={[styles.modalInput, styles.modalTextArea]}
              multiline
            />
            <Pressable
              style={styles.dateField}
              onPress={() => openPicker("start")}
            >
              <Text style={styles.dateFieldLabel}>Start</Text>
              <Text style={styles.dateFieldValue}>
                {formatEventDate(eventStartAt)}
              </Text>
            </Pressable>
            <Pressable
              style={styles.dateField}
              onPress={() => openPicker("end")}
            >
              <Text style={styles.dateFieldLabel}>End</Text>
              <Text style={styles.dateFieldValue}>
                {formatEventDate(eventEndAt)}
              </Text>
            </Pressable>
            {pickerTarget ? (
              <View style={styles.pickerWrap}>
                <Text style={styles.selectorLabel}>
                  {pickerTarget === "start" ? "Start" : "End"}{" "}
                  {pickerMode === "date" ? "date" : "time"}
                </Text>
                <DateTimePicker
                  value={
                    (pickerTarget === "start" ? eventStartAt : eventEndAt) ??
                    new Date()
                  }
                  mode={pickerMode}
                  display="default"
                  is24Hour
                  onChange={handlePickerChange}
                />
                {Platform.OS === "ios" ? (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      setPickerTarget(null);
                      setPickerMode("date");
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Done</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <TextInput
              value={eventLocationLabel}
              onChangeText={(value) => {
                setEventLocationLabel(value);
                setEventLocationPoint(null);
                setSelectedEventNeighborhood("");
                setEventResolutionMessage(null);
              }}
              placeholder="Location"
              placeholderTextColor={colors.textMuted}
              style={styles.modalInput}
            />
            <View style={styles.eventComposerActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  setEventLocationLabel(profile.homeAddressLabel ?? "")
                }
              >
                <Text style={styles.secondaryButtonText}>Use home address</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={handleResolveEventLocation}
              >
                <Text style={styles.secondaryButtonText}>Resolve location</Text>
              </Pressable>
            </View>
            <Text style={styles.coordinatesText}>
              {formatEventCoordinates(eventLocationPoint)}
            </Text>
            {eventResolutionMessage ? (
              <Text style={styles.bodyInfo}>{eventResolutionMessage}</Text>
            ) : null}
            <View style={[styles.mapCard, { height: eventMapHeight + 88 }]}>
              <Text style={styles.mapTitle}>Official neighborhood map</Text>
              {loadingNeighborhoods ? (
                <View style={styles.mapLoadingBlock}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.bodyInfo}>Loading neighborhoods...</Text>
                </View>
              ) : neighborhoods.length ? (
                <View style={styles.mapContainer}>
                  <MapView
                    ref={eventMapRef}
                    style={styles.map}
                    initialRegion={TIMISOARA_REGION}
                    onPress={(event) =>
                      handleEventMapPress(
                        event.nativeEvent.coordinate.latitude,
                        event.nativeEvent.coordinate.longitude,
                      )
                    }
                  >
                    {sortedNeighborhoods.flatMap((neighborhood) => {
                      const strokeColor = colorForNeighborhood(
                        neighborhood.name,
                      );
                      const isSelected =
                        selectedEventNeighborhood === neighborhood.name;

                      return neighborhood.polygons.map((polygon, index) => (
                        <Polygon
                          key={`${neighborhood.id}-${index}`}
                          coordinates={polygon.map(([longitude, latitude]) => ({
                            latitude,
                            longitude,
                          }))}
                          strokeColor={strokeColor}
                          fillColor={hexToRgba(
                            strokeColor,
                            isSelected ? 0.36 : 0.18,
                          )}
                          strokeWidth={isSelected ? 3 : 1.5}
                        />
                      ));
                    })}
                    {eventLocationPoint ? (
                      <Marker
                        key={`${eventLocationPoint[0]}-${eventLocationPoint[1]}`}
                        coordinate={{
                          latitude: eventLocationPoint[1],
                          longitude: eventLocationPoint[0],
                        }}
                        title="Event location"
                        description={eventLocationLabel.trim() || undefined}
                        pinColor={colors.primary}
                      />
                    ) : null}
                  </MapView>
                </View>
              ) : (
                <Text style={styles.errorText}>
                  Neighborhood map could not be loaded.
                </Text>
              )}
              <Text style={styles.mapHint}>
                {selectedEventNeighborhood
                  ? `Selected neighborhood: ${selectedEventNeighborhood}`
                  : "No neighborhood selected yet."}
              </Text>
            </View>

            {visibleTargetGroups.length ? (
              <View style={styles.targetGroupsWrap}>
                <Text style={styles.selectorLabel}>Optional target group</Text>
                {visibleTargetGroups.slice(0, 8).map((group) => {
                  const active = targetGroupId === group.id;
                  return (
                    <Pressable
                      key={group.id}
                      style={[
                        styles.targetGroupChip,
                        active && styles.targetGroupChipActive,
                      ]}
                      onPress={() => setTargetGroupId(active ? null : group.id)}
                    >
                      <Text
                        style={[
                          styles.targetGroupText,
                          active && styles.targetGroupTextActive,
                        ]}
                      >
                        {group.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={[
                styles.primaryButton,
                submittingEvent && styles.buttonDisabled,
              ]}
              onPress={handleCreateEvent}
              disabled={submittingEvent}
            >
              <Text style={styles.primaryButtonText}>
                {submittingEvent ? "Sending..." : "Send event"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                resetEventComposer();
                setShowEventComposer(false);
              }}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      <ImageViewerModal
        visible={Boolean(viewerImageUri)}
        imageUri={viewerImageUri}
        title={viewerTitle}
        onClose={() => setViewerImageUri(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
  },
  chatHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  chatTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 20,
  },
  chatMeta: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  chatDescription: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  headerHint: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 8,
  },
  eventLaunchButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
    borderRadius: 14,
    backgroundColor: "#0D5E57",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  eventLaunchButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  eventReviewButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  eventReviewButtonText: {
    color: colors.text,
    fontWeight: "800",
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ownBubble: {
    backgroundColor: "#D7F5EE",
  },
  otherBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    marginBottom: spacing.xs,
  },
  senderName: {
    color: colors.primary,
    fontWeight: "800",
  },
  messageText: {
    color: colors.text,
    lineHeight: 20,
  },
  eventCard: {
    gap: spacing.xs,
  },
  eventTagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    alignItems: "center",
  },
  eventTag: {
    color: "#0D5E57",
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 11,
  },
  eventTime: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
  eventTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 17,
  },
  eventLocation: {
    color: colors.primary,
    fontWeight: "700",
  },
  attendeeNames: {
    color: colors.textMuted,
    lineHeight: 19,
  },
  attendButton: {
    marginTop: spacing.xs,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  attendButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginTop: spacing.sm,
    backgroundColor: "#E5E7EB",
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
  },
  composer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  attachButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  attachButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
  },
  sendButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  previewImage: {
    width: 84,
    height: 84,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: "#B42318",
    textAlign: "center",
    marginTop: spacing.sm,
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
    maxHeight: "88%",
  },
  eventSheetContent: {
    gap: spacing.sm,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  sheetMeta: {
    color: colors.primary,
    fontWeight: "700",
  },
  sheetDescription: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalTextArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  dateField: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  dateFieldLabel: {
    color: colors.primary,
    fontWeight: "800",
  },
  dateFieldValue: {
    color: colors.text,
  },
  pickerWrap: {
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    backgroundColor: "#F8FAFC",
  },
  mapCard: {
    borderRadius: 22,
    backgroundColor: "#F7FAFA",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  mapTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
    borderRadius: 18,
  },
  mapHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  mapLoadingBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  eventComposerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bodyInfo: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  coordinatesText: {
    color: colors.primary,
    fontWeight: "800",
  },
  shareToggle: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    backgroundColor: "#F8FAFC",
  },
  shareToggleLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  targetGroupsWrap: {
    gap: spacing.xs,
  },
  selectorLabel: {
    color: colors.primary,
    fontWeight: "800",
  },
  targetGroupChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  targetGroupChipActive: {
    backgroundColor: "#D7F5EE",
    borderColor: colors.primary,
  },
  targetGroupText: {
    color: colors.text,
    fontWeight: "700",
  },
  targetGroupTextActive: {
    color: "#0D5E57",
  },
  memberPreviewWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  memberPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  memberPreviewName: {
    color: colors.text,
    fontWeight: "700",
    flex: 1,
  },
  memberPreviewRole: {
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 22,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  dangerButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#B42318",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
