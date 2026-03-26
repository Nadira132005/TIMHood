import mongoose from "mongoose";
import { connectDb } from "../config/db";
import {
  Community,
  CommunityMessage,
} from "../modules/communities/communities.model";
import { User } from "../modules/identity/identity.model";
import { resolveVisibleProfilePhoto } from "../shared/utils/avatar";

const TARGET_NEIGHBORHOOD = "Braytim";
const TARGET_GROUP_KEY = "general-announcements";
const APPROVED_EVENT_THREAD_ID =
  "seed-braytim-general-announcements-community-meetup";
const PENDING_EVENT_THREAD_ID =
  "seed-braytim-general-announcements-street-library-session";
const EVENT_CREATOR_ID = "TM1062176";

function buildEventWindow(now: Date, dayOffset: number) {
  const startAt = new Date(now);
  startAt.setUTCDate(startAt.getUTCDate() + dayOffset);
  startAt.setUTCHours(15, 30, 0, 0);

  const endAt = new Date(startAt);
  endAt.setUTCHours(18, 0, 0, 0);

  return { startAt, endAt };
}

async function seedEvent(
  communityId: string,
  creatorName: string,
  creatorPhoto: string,
  options: {
    threadId: string;
    title: string;
    description: string;
    locationLabel: string;
    coordinates: [number, number];
    dayOffset: number;
    approvalStatus: "approved" | "pending";
  },
): Promise<void> {
  const existingEvent = await CommunityMessage.findOne({
    community_id: communityId,
    message_type: "event",
    event_thread_id: options.threadId,
  }).lean();

  if (existingEvent) {
    console.log(
      `Event ${options.threadId} already exists in ${TARGET_NEIGHBORHOOD}/${TARGET_GROUP_KEY}`,
    );
    return;
  }

  const now = new Date();
  const { startAt, endAt } = buildEventWindow(now, options.dayOffset);

  await CommunityMessage.create({
    community_id: communityId,
    user_id: EVENT_CREATOR_ID,
    user_name: creatorName,
    user_photo_base64: creatorPhoto,
    message_type: "event",
    approval_status: options.approvalStatus,
    approved_by_user_id:
      options.approvalStatus === "approved" ? EVENT_CREATOR_ID : undefined,
    approved_at: options.approvalStatus === "approved" ? now : undefined,
    event_thread_id: options.threadId,
    event_title: options.title,
    event_description: options.description,
    event_starts_at: startAt,
    event_ends_at: endAt,
    event_location_label: options.locationLabel,
    event_location_point: {
      type: "Point",
      coordinates: options.coordinates,
    },
    attendees: [],
    created_at: now,
    updated_at: now,
  });

  console.log(
    `Seeded ${options.approvalStatus} event "${options.title}" in ${TARGET_NEIGHBORHOOD}/${TARGET_GROUP_KEY}`,
  );
}

async function seedBraytimGeneralAnnouncementsEvent(): Promise<void> {
  const community = await Community.findOne({
    neighborhood_name: TARGET_NEIGHBORHOOD,
    group_key: TARGET_GROUP_KEY,
    state: "active",
  }).lean();

  if (!community) {
    throw new Error(
      `Community not found for neighborhood "${TARGET_NEIGHBORHOOD}" and group "${TARGET_GROUP_KEY}"`,
    );
  }

  const user = await User.findById(EVENT_CREATOR_ID)
    .select(
      "full_name verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 document_number show_photo_to_others",
    )
    .lean();

  if (!user) {
    throw new Error(`User "${EVENT_CREATOR_ID}" not found`);
  }

  const creatorName =
    user.full_name || user.document_number || EVENT_CREATOR_ID;
  const creatorPhoto = resolveVisibleProfilePhoto({
    fullName: user.full_name,
    profilePhotoBase64:
      user.verified_profile_photo_base64 ||
      user.profile_photo_base64 ||
      user.avatar_photo_base64,
    showPhotoToOthers: user.show_photo_to_others,
    fallbackLabel: user.document_number || EVENT_CREATOR_ID,
  });

  await seedEvent(String(community._id), creatorName, creatorPhoto, {
    threadId: APPROVED_EVENT_THREAD_ID,
    title: "Braytim spring coffee meetup",
    description:
      "Open neighborhood meetup in the square near the park entrance. Drop by for coffee, intros, and planning the next local hangout.",
    locationLabel: "Braytim park entrance square",
    coordinates: [21.2486, 45.7197],
    dayOffset: 5,
    approvalStatus: "approved",
  });

  await seedEvent(String(community._id), creatorName, creatorPhoto, {
    threadId: PENDING_EVENT_THREAD_ID,
    title: "Braytim street library setup",
    description:
      "Proposed volunteer meetup to organize donated books and assemble a small take-one-leave-one library shelf near the neighborhood square.",
    locationLabel: "Braytim community notice board",
    coordinates: [21.2479, 45.7188],
    dayOffset: 8,
    approvalStatus: "pending",
  });
}

async function main(): Promise<void> {
  await connectDb();
  console.log("Connected to MongoDB");
  await seedBraytimGeneralAnnouncementsEvent();
  await mongoose.disconnect();
  console.log("Disconnected");
}

main().catch(async (error) => {
  console.error("Event seed failed", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
