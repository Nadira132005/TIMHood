import mongoose from "mongoose";
import { connectDb } from "../config/db";
import {
  Community,
  CommunityMembership,
  CommunityMessage,
} from "../modules/communities/communities.model";
import { communitiesService } from "../modules/communities/communities.service";
import { User } from "../modules/identity/identity.model";
import {
  Neighborhood,
  NeighborhoodMessage,
} from "../modules/neighborhoods/neighborhoods.model";
import { FriendRequest } from "../modules/social/social.model";

type BraytimUserSeed = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  address: string;
  bio: string;
  accent: string;
};

const BRAYTIM_USERS: BraytimUserSeed[] = [
  {
    id: "BRAYTIM-SEED-01",
    firstName: "Ioana",
    lastName: "Dumitru",
    birthDate: "1991-04-12",
    address: "Strada Mures 15",
    bio: "Organizes coffee meetups and always knows the quiet parks.",
    accent: "#F97316",
  },
  {
    id: "BRAYTIM-SEED-02",
    firstName: "Vlad",
    lastName: "Mocanu",
    birthDate: "1988-09-03",
    address: "Strada Musicescu 21",
    bio: "Cycling fan, football on weekends, and handy with tools.",
    accent: "#0F766E",
  },
  {
    id: "BRAYTIM-SEED-03",
    firstName: "Adina",
    lastName: "Rusu",
    birthDate: "1994-02-08",
    address: "Strada Tosca 6",
    bio: "Shares book swaps, tutoring tips, and bakery recommendations.",
    accent: "#8B5CF6",
  },
  {
    id: "BRAYTIM-SEED-04",
    firstName: "Cristi",
    lastName: "Stan",
    birthDate: "1986-07-19",
    address: "Strada Venus 11",
    bio: "Runs pickup basketball and helps neighbors move furniture.",
    accent: "#2563EB",
  },
  {
    id: "BRAYTIM-SEED-05",
    firstName: "Elena",
    lastName: "Serban",
    birthDate: "1990-11-25",
    address: "Strada Albastrelelor 9",
    bio: "Pet-friendly neighbor with a camera roll full of local events.",
    accent: "#EC4899",
  },
  {
    id: "BRAYTIM-SEED-06",
    firstName: "Mihai",
    lastName: "Luca",
    birthDate: "1993-01-14",
    address: "Strada Mures 38",
    bio: "Marketplace regular, helps with computer issues and printers.",
    accent: "#14B8A6",
  },
  {
    id: "BRAYTIM-SEED-07",
    firstName: "Bianca",
    lastName: "Nita",
    birthDate: "1997-06-22",
    address: "Strada Aries 13",
    bio: "Coordinates playdates and family-friendly neighborhood outings.",
    accent: "#EAB308",
  },
  {
    id: "BRAYTIM-SEED-08",
    firstName: "Razvan",
    lastName: "Cojocaru",
    birthDate: "1989-03-16",
    address: "Strada Tosca 18",
    bio: "Always posting about local runs, tennis, and group workouts.",
    accent: "#DC2626",
  },
  {
    id: "BRAYTIM-SEED-09",
    firstName: "Sorina",
    lastName: "Ilie",
    birthDate: "1992-12-05",
    address: "Strada Venus 27",
    bio: "Community supper host, cat lover, and movie night planner.",
    accent: "#7C3AED",
  },
  {
    id: "BRAYTIM-SEED-10",
    firstName: "Paul",
    lastName: "Neagu",
    birthDate: "1987-05-30",
    address: "Strada Musicescu 34",
    bio: "Shares renovation advice, local service tips, and cleanup days.",
    accent: "#059669",
  },
];

const STANDARD_GROUP_MEMBERS: Record<string, string[]> = {
  "general-announcements": BRAYTIM_USERS.map((user) => user.id),
  "help-support": [
    "BRAYTIM-SEED-01",
    "BRAYTIM-SEED-02",
    "BRAYTIM-SEED-06",
    "BRAYTIM-SEED-10",
  ],
  "kids-family": [
    "BRAYTIM-SEED-01",
    "BRAYTIM-SEED-03",
    "BRAYTIM-SEED-07",
    "BRAYTIM-SEED-09",
  ],
  "education-learning": ["BRAYTIM-SEED-03", "BRAYTIM-SEED-07"],
  "sports-activities": [
    "BRAYTIM-SEED-02",
    "BRAYTIM-SEED-04",
    "BRAYTIM-SEED-08",
  ],
  "marketplace-buy-sell-free": [
    "BRAYTIM-SEED-05",
    "BRAYTIM-SEED-06",
    "BRAYTIM-SEED-09",
    "BRAYTIM-SEED-10",
  ],
  "social-events": [
    "BRAYTIM-SEED-01",
    "BRAYTIM-SEED-04",
    "BRAYTIM-SEED-05",
    "BRAYTIM-SEED-09",
  ],
  pets: ["BRAYTIM-SEED-05", "BRAYTIM-SEED-09"],
};

function buildAvatar(
  firstName: string,
  lastName: string,
  background: string,
): string {
  const initials =
    `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="42" fill="url(#g)" />
      <circle cx="120" cy="88" r="40" fill="#F8E7D6" />
      <path d="M56 210c14-40 42-62 64-62s50 22 64 62" fill="#F8E7D6" />
      <text x="120" y="222" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#fff">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildPhotoCard(label: string, background: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <rect width="1200" height="1200" rx="90" fill="${background}" />
      <circle cx="960" cy="220" r="90" fill="rgba(255,255,255,0.2)" />
      <circle cx="240" cy="980" r="120" fill="rgba(255,255,255,0.12)" />
      <text x="90" y="180" font-family="Arial" font-size="68" font-weight="700" fill="#ffffff">TIMHood</text>
      <text x="90" y="310" font-family="Arial" font-size="110" font-weight="800" fill="#ffffff">${label}</text>
      <text x="90" y="420" font-family="Arial" font-size="42" fill="rgba(255,255,255,0.88)">Shared from the Braytim community</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function ensureUser(seed: BraytimUserSeed): Promise<void> {
  const now = new Date();
  await User.findOneAndUpdate(
    { _id: seed.id },
    {
      $set: {
        document_number: seed.id,
        first_name: seed.firstName,
        last_name: seed.lastName,
        full_name: `${seed.firstName} ${seed.lastName}`,
        nationality: "ROU",
        issuing_state: "ROU",
        date_of_birth: new Date(`${seed.birthDate}T00:00:00.000Z`),
        date_of_expiry: new Date("2035-12-31T00:00:00.000Z"),
        profile_photo_base64: buildAvatar(
          seed.firstName,
          seed.lastName,
          seed.accent,
        ),
        bio: seed.bio,
        show_photo_to_others: true,
        show_age_to_others: true,
        home_address_label: seed.address,
        home_neighborhood: "Braytim",
        verification_state: "verified",
        account_status: "active",
        verified_at: now,
        verification_locked_at: now,
        document_checked_at: now,
        last_seen_at: now,
      },
      $setOnInsert: {
        _id: seed.id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function ensureMembership(
  communityId: string,
  userId: string,
): Promise<void> {
  const existing = await CommunityMembership.findOne({
    community_id: communityId,
    user_id: userId,
  });
  if (!existing) {
    await CommunityMembership.create({
      community_id: communityId,
      user_id: userId,
      role: "member",
      status: "active",
      joined_at: new Date(),
    });
    await Community.findByIdAndUpdate(communityId, {
      $inc: { members_count: 1 },
    });
    return;
  }

  if (existing.status !== "active") {
    existing.status = "active";
    existing.joined_at = new Date();
    await existing.save();
  }
}

async function seedGroupMessages(
  groupKey: string,
  messages: Array<{ userId: string; text?: string; imageBase64?: string }>,
): Promise<void> {
  const community = await Community.findOne({
    neighborhood_name: "Braytim",
    group_key: groupKey,
    state: "active",
  }).lean();
  if (!community) {
    return;
  }

  const existingCount = await CommunityMessage.countDocuments({
    community_id: community._id,
  });
  if (existingCount > 0) {
    return;
  }

  const users = await User.find({
    _id: { $in: messages.map((entry) => entry.userId) },
  })
    .select("full_name profile_photo_base64")
    .lean();

  await CommunityMessage.insertMany(
    messages.map((message, index) => {
      const user = users.find((entry) => String(entry._id) === message.userId);
      return {
        community_id: community._id,
        user_id: message.userId,
        user_name: user?.full_name || message.userId,
        user_photo_base64: user?.profile_photo_base64,
        text: message.text,
        image_base64: message.imageBase64,
        created_at: new Date(
          Date.now() - (messages.length - index) * 1000 * 60 * 42,
        ),
        updated_at: new Date(
          Date.now() - (messages.length - index) * 1000 * 60 * 42,
        ),
      };
    }),
  );
}

async function seedNeighborhoodMessages(): Promise<void> {
  const neighborhood = await Neighborhood.findOne({ name: "Braytim" }).lean();
  if (!neighborhood) {
    return;
  }

  const existingCount = await NeighborhoodMessage.countDocuments({
    neighborhood_id: neighborhood._id,
  });
  if (existingCount > 0) {
    return;
  }

  const users = await User.find({
    _id: { $in: BRAYTIM_USERS.slice(0, 5).map((entry) => entry.id) },
  })
    .select("full_name document_number profile_photo_base64")
    .lean();

  const feed = [
    {
      userId: "BRAYTIM-SEED-01",
      text: "Good morning, Braytim. The bakery on the corner just reopened.",
    },
    {
      userId: "BRAYTIM-SEED-02",
      text: "Anyone up for an evening bike ride near Musicescu?",
    },
    {
      userId: "BRAYTIM-SEED-05",
      text: "I posted a few photos from yesterday's cleanup walk.",
      imageBase64: buildPhotoCard("Braytim cleanup", "#0F8C7C"),
    },
    {
      userId: "BRAYTIM-SEED-09",
      text: "Movie night this Friday at 20:00 in the social group.",
    },
  ];

  await NeighborhoodMessage.insertMany(
    feed.map((entry, index) => {
      const user = users.find(
        (candidate) => String(candidate._id) === entry.userId,
      );
      return {
        neighborhood_id: neighborhood._id,
        user_id: entry.userId,
        user_name: user?.full_name || entry.userId,
        user_document_number: user?.document_number || entry.userId,
        user_photo_base64: user?.profile_photo_base64,
        text: entry.text,
        image_base64: entry.imageBase64,
        created_at: new Date(
          Date.now() - (feed.length - index) * 1000 * 60 * 35,
        ),
        updated_at: new Date(
          Date.now() - (feed.length - index) * 1000 * 60 * 35,
        ),
      };
    }),
  );
}

async function ensureFriendship(userA: string, userB: string): Promise<void> {
  await FriendRequest.findOneAndUpdate(
    { from_user_id: userA, to_user_id: userB },
    { from_user_id: userA, to_user_id: userB, status: "accepted" },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function seedBraytimCommunity(): Promise<void> {
  await Promise.all(BRAYTIM_USERS.map((user) => ensureUser(user)));

  await communitiesService.ensureNeighborhoodGroupsForUser(
    BRAYTIM_USERS[0].id,
    "Braytim",
  );

  const groups = await Community.find({
    neighborhood_name: "Braytim",
    group_kind: "standard",
    state: "active",
  })
    .select("_id group_key")
    .lean();

  for (const group of groups) {
    const members = STANDARD_GROUP_MEMBERS[group.group_key || ""] || [];
    for (const userId of members) {
      await ensureMembership(String(group._id), userId);
    }
  }

  await Promise.all([
    ensureFriendship("BRAYTIM-SEED-01", "BRAYTIM-SEED-07"),
    ensureFriendship("BRAYTIM-SEED-02", "BRAYTIM-SEED-08"),
    ensureFriendship("BRAYTIM-SEED-05", "BRAYTIM-SEED-09"),
    ensureFriendship("BRAYTIM-SEED-06", "BRAYTIM-SEED-10"),
  ]);

  await seedGroupMessages("general-announcements", [
    {
      userId: "BRAYTIM-SEED-01",
      text: "Welcome to all the new Braytim neighbors joining this week.",
    },
    {
      userId: "BRAYTIM-SEED-10",
      text: "Street sweeping is scheduled for Thursday morning on Musicescu.",
    },
    {
      userId: "BRAYTIM-SEED-05",
      text: "Shared a few snapshots from the little community picnic.",
      imageBase64: buildPhotoCard("Braytim picnic", "#D66A3D"),
    },
    {
      userId: "BRAYTIM-SEED-03",
      text: "The library corner at the school gate is stocked again.",
    },
    {
      userId: "BRAYTIM-SEED-02",
      text: "The football field lights are on tonight if anyone wants a casual match.",
    },
  ]);

  await seedGroupMessages("marketplace-buy-sell-free", [
    {
      userId: "BRAYTIM-SEED-06",
      text: "Giving away two desk chairs in good condition.",
    },
    {
      userId: "BRAYTIM-SEED-09",
      text: "Fresh herbs and tomato seedlings available this weekend.",
      imageBase64: buildPhotoCard("Balcony seedlings", "#0F8C7C"),
    },
    {
      userId: "BRAYTIM-SEED-10",
      text: "Looking for a compact bookshelf or toy storage unit.",
    },
    {
      userId: "BRAYTIM-SEED-05",
      text: "Free moving boxes left near Venus 27 if anyone needs them.",
    },
  ]);

  await seedGroupMessages("social-events", [
    {
      userId: "BRAYTIM-SEED-09",
      text: "Friday movie night idea: outdoor screening if the weather stays good.",
    },
    {
      userId: "BRAYTIM-SEED-01",
      text: "Sunday coffee walk from the park entrance at 10:30.",
    },
    {
      userId: "BRAYTIM-SEED-04",
      text: "Board game evening next week, I can host six people.",
    },
    {
      userId: "BRAYTIM-SEED-05",
      text: "Sharing the poster draft for the mini street fair.",
      imageBase64: buildPhotoCard("Street fair", "#8B5CF6"),
    },
  ]);

  await seedGroupMessages("pets", [
    {
      userId: "BRAYTIM-SEED-05",
      text: "Friendly golden retriever spotted loose near Albastrelelor around 18:00.",
    },
    {
      userId: "BRAYTIM-SEED-09",
      text: "Our cat Miso is back home, thank you everyone.",
    },
    {
      userId: "BRAYTIM-SEED-05",
      text: "Sharing the new dog walking route map.",
      imageBase64: buildPhotoCard("Dog walk route", "#059669"),
    },
  ]);

  await seedGroupMessages("sports-activities", [
    {
      userId: "BRAYTIM-SEED-08",
      text: "Morning run group leaves at 07:00 from the park gate tomorrow.",
    },
    {
      userId: "BRAYTIM-SEED-02",
      text: "Need two more people for a casual football match tonight.",
    },
    {
      userId: "BRAYTIM-SEED-04",
      text: "I posted the stretch routine from the basketball meetup.",
      imageBase64: buildPhotoCard("Stretch routine", "#2563EB"),
    },
  ]);

  await seedGroupMessages("help-support", [
    {
      userId: "BRAYTIM-SEED-10",
      text: "Does anyone know a reliable locksmith nearby?",
    },
    {
      userId: "BRAYTIM-SEED-06",
      text: "I can help with printer setup and simple laptop issues this afternoon.",
    },
    {
      userId: "BRAYTIM-SEED-01",
      text: "Looking for a recommendation for a pediatric dentist close to Braytim.",
    },
  ]);

  await seedNeighborhoodMessages();
}

async function main(): Promise<void> {
  await connectDb();
  console.log("Connected to MongoDB");
  console.log("Seeding Braytim community...");

  await seedBraytimCommunity();

  console.log("Braytim seed finished");
  await mongoose.disconnect();
  console.log("Disconnected");
}

main().catch(async (error) => {
  console.error("Braytim seed failed", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
