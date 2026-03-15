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
const EVENT_THREAD_ID = "seed-braytim-general-announcements-community-meetup";
const EVENT_CREATOR_ID = "BRAYTIM-SEED-01";

function buildEventWindow(now: Date) {
  const startAt = new Date(now);
  startAt.setUTCDate(startAt.getUTCDate() + 5);
  startAt.setUTCHours(15, 30, 0, 0);

  const endAt = new Date(startAt);
  endAt.setUTCHours(18, 0, 0, 0);

  return { startAt, endAt };
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

  const existingEvent = await CommunityMessage.findOne({
    community_id: community._id,
    message_type: "event",
    event_thread_id: EVENT_THREAD_ID,
  }).lean();

  if (existingEvent) {
    console.log(
      `Event already exists in ${TARGET_NEIGHBORHOOD}/${TARGET_GROUP_KEY}`,
    );
    return;
  }

  const user = await User.findById(EVENT_CREATOR_ID)
    .select(
      "full_name verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 document_number show_photo_to_others",
    )
    .lean();

  if (!user) {
    throw new Error(`User "${EVENT_CREATOR_ID}" not found`);
  }

  const creatorName = user.full_name || user.document_number || EVENT_CREATOR_ID;
  const creatorPhoto = resolveVisibleProfilePhoto({
    fullName: user.full_name,
    profilePhotoBase64:
      user.verified_profile_photo_base64 ||
      user.profile_photo_base64 ||
      user.avatar_photo_base64,
    showPhotoToOthers: user.show_photo_to_others,
    fallbackLabel: user.document_number || EVENT_CREATOR_ID,
  });
  const now = new Date();
  const { startAt, endAt } = buildEventWindow(now);

  await CommunityMessage.create({
    community_id: community._id,
    user_id: EVENT_CREATOR_ID,
    user_name: creatorName,
    user_photo_base64: creatorPhoto,
    message_type: "event",
    approval_status: "approved",
    approved_by_user_id: EVENT_CREATOR_ID,
    approved_at: now,
    event_thread_id: EVENT_THREAD_ID,
    event_title: "Braytim spring coffee meetup",
    event_description:
      "Open neighborhood meetup in the square near the park entrance. Drop by for coffee, intros, and planning the next local hangout.",
    event_starts_at: startAt,
    event_ends_at: endAt,
    event_location_label: "Braytim park entrance square",
    event_location_point: {
      type: "Point",
      coordinates: [21.2486, 45.7197],
    },
    attendees: [],
    created_at: now,
    updated_at: now,
  });

  console.log(
    `Seeded event "${TARGET_NEIGHBORHOOD}/${TARGET_GROUP_KEY}" from ${startAt.toISOString()} to ${endAt.toISOString()}`,
  );
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
