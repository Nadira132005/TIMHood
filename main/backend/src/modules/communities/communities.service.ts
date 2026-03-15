import { HttpError } from '../../shared/utils/http-error';
import { ensureStoredProfilePhoto, isGeneratedAvatarDataUri, resolveVisibleProfilePhoto } from '../../shared/utils/avatar';
import { User } from '../identity/identity.model';
import { FriendRequest } from '../social/social.model';
import { Community, CommunityInvite, CommunityMembership, CommunityMessage, CommunitySettings } from './communities.model';

const STANDARD_GROUPS = [
  { key: 'general-announcements', name: 'General / Announcements', description: 'News, local updates, and important neighborhood announcements.' },
  { key: 'help-support', name: 'Help & Support', description: 'Ask neighbors for practical help, advice, and quick support.' },
  { key: 'kids-family', name: 'Kids & Family', description: 'Parents, childcare topics, playdates, and family activities.' },
  { key: 'education-learning', name: 'Education & Learning', description: 'Schools, tutoring, study groups, and learning resources.' },
  { key: 'sports-activities', name: 'Sports & Activities', description: 'Training partners, local sport meetups, and active hobbies.' },
  { key: 'marketplace-buy-sell-free', name: 'Marketplace / Buy-Sell-Free', description: 'Sell, buy, gift, and exchange useful items nearby.' },
  { key: 'social-events', name: 'Social & Events', description: 'Meetups, neighborhood socials, and events.' },
  { key: 'pets', name: 'Pets', description: 'Pet owners, lost and found, walks, and recommendations.' }
] as const;

type CommunityListItem = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  membersCount: number;
  role?: string;
  visibility: 'public' | 'private';
  groupKind: 'standard' | 'custom';
  neighborhoodName?: string;
  canDelete?: boolean;
  canLeave?: boolean;
};

type DiscoverGroupsResponse = {
  neighborhoodName: string;
  joinedGroups: CommunityListItem[];
  standardGroups: CommunityListItem[];
  publicGroups: CommunityListItem[];
  friends: Array<{ userId: string; fullName: string }>;
};

type GroupDetailResponse = {
  group: CommunityListItem;
  joined: boolean;
  canViewMembers: boolean;
};

type GroupChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userPhotoBase64?: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type GroupChatResponse = {
  group: CommunityListItem;
  canViewMembers: boolean;
  messages: GroupChatMessage[];
};

type GroupMemberItem = {
  userId: string;
  fullName: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  bio?: string;
  photoBase64?: string;
};

type GroupMembersResponse = {
  group: CommunityListItem;
  requesterRole: 'owner' | 'admin' | 'member';
  members: GroupMemberItem[];
  invitableFriends: Array<{ userId: string; fullName: string }>;
};

type PendingGroupInvite = {
  inviteId: string;
  communityId: string;
  groupName: string;
  inviterUserId: string;
  inviterName: string;
};

function buildSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function canDeleteCommunity(community: { group_kind: string; created_by_user_id: string }, userId: string) {
  return community.group_kind === 'custom' && community.created_by_user_id === userId;
}

function canLeaveCommunity(
  community: { group_kind: string; group_key?: string | null },
  membership?: { role?: string } | null
) {
  if (!membership) {
    return false;
  }
  if (community.group_kind === 'standard' && community.group_key === 'general-announcements') {
    return false;
  }
  return true;
}

async function ensureCommunitySettings(communityId: string, ownerUserId: string) {
  await CommunitySettings.findOneAndUpdate(
    { community_id: communityId },
    {
      community_id: communityId,
      waiting_room_enabled: false,
      access_mode: 'open',
      publish_mode: 'direct',
      reply_mode: 'fully_allowed',
      allow_anonymous_participation: false,
      posts_enabled: true,
      events_enabled: true,
      polls_enabled: true,
      pings_enabled: true,
      services_enabled: true,
      daily_riddle_enabled: false,
      updated_by_user_id: ownerUserId
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensureNeighborhoodStandardGroups(neighborhoodName: string, ownerUserId: string) {
  const neighborhoodSlug = buildSlug(neighborhoodName);

  for (const group of STANDARD_GROUPS) {
    const community = await Community.findOneAndUpdate(
      { neighborhood_name: neighborhoodName, group_key: group.key },
      {
        name: `${neighborhoodName} · ${group.name}`,
        slug: `${neighborhoodSlug}-${group.key}`,
        description: group.description,
        created_by_user_id: ownerUserId,
        neighborhood_name: neighborhoodName,
        group_kind: 'standard',
        group_key: group.key,
        visibility: 'public',
        state: 'active'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await ensureCommunitySettings(String(community._id), ownerUserId);
  }
}

async function ensureDefaultMembership(userId: string, neighborhoodName: string) {
  const defaultGroup = await Community.findOne({
    neighborhood_name: neighborhoodName,
    group_key: 'general-announcements',
    group_kind: 'standard',
    state: 'active'
  });

  if (!defaultGroup) {
    return;
  }

  const existing = await CommunityMembership.findOne({
    community_id: defaultGroup._id,
    user_id: userId
  });

  if (!existing) {
    await CommunityMembership.create({
      community_id: defaultGroup._id,
      user_id: userId,
      role: 'member',
      status: 'active',
      joined_at: new Date()
    });
    defaultGroup.members_count += 1;
    await defaultGroup.save();
  } else if (existing.status !== 'active') {
    existing.status = 'active';
    existing.joined_at = new Date();
    await existing.save();
  }
}

async function ensureDefaultMembershipsForNeighborhoodUsers(neighborhoodName: string, ownerUserId: string) {
  await ensureNeighborhoodStandardGroups(neighborhoodName, ownerUserId);

  const users = await User.find({ home_neighborhood: neighborhoodName })
    .select('_id')
    .lean();

  for (const user of users) {
    await ensureDefaultMembership(String(user._id), neighborhoodName);
  }
}

async function mapMemberships(userId: string) {
  const memberships = await CommunityMembership.find({
    user_id: userId,
    status: 'active'
  })
    .select('community_id role')
    .lean();

  const communityIds = memberships.map((membership) => membership.community_id);
  const communities = communityIds.length
    ? await Community.find({ _id: { $in: communityIds }, state: 'active' }).lean()
    : [];

  return communities.map((community) => {
    const membership = memberships.find((entry) => String(entry.community_id) === String(community._id));
    return {
      id: String(community._id),
      name: community.name,
      slug: community.slug,
      description: community.description,
      membersCount: community.members_count,
      role: membership?.role,
      visibility: community.visibility,
      groupKind: community.group_kind,
      neighborhoodName: community.neighborhood_name,
      canDelete: canDeleteCommunity(community, userId),
      canLeave: canLeaveCommunity(community, membership)
    } satisfies CommunityListItem;
  });
}

async function getActiveMembership(userId: string, communityId: string) {
  return CommunityMembership.findOne({
    community_id: communityId,
    user_id: userId,
    status: 'active'
  }).lean();
}

async function requireGroupAccess(userId: string, communityId: string) {
  const community = await Community.findById(communityId).lean();
  if (!community || community.state !== 'active') {
    throw new HttpError(404, 'Group not found');
  }

  const membership = await getActiveMembership(userId, communityId);
  if (!membership) {
    throw new HttpError(403, 'You are not a member of this group');
  }

  return { community, membership };
}

async function mapFriends(userId: string) {
  const requests = await FriendRequest.find({
    $or: [
      { from_user_id: userId, status: 'accepted' },
      { to_user_id: userId, status: 'accepted' }
    ]
  }).lean();

  const friendIds = requests.map((request) => (request.from_user_id === userId ? request.to_user_id : request.from_user_id));
  const friends = friendIds.length ? await User.find({ _id: { $in: friendIds } }).select('full_name').lean() : [];

  return friends.map((friend) => ({
    userId: String(friend._id),
    fullName: friend.full_name || String(friend._id)
  }));
}

export const communitiesService = {
  async getOverview() {
    const [communities, memberships] = await Promise.all([
      Community.countDocuments(),
      CommunityMembership.countDocuments()
    ]);

    return {
      module: 'communities',
      status: 'ready',
      totals: { communities, memberships }
    };
  },

  async ensureNeighborhoodGroupsForUser(userId: string, neighborhoodName: string) {
    await ensureDefaultMembershipsForNeighborhoodUsers(neighborhoodName, userId);
  },

  async getDashboard(userId: string) {
    const user = await User.findById(userId).select('home_neighborhood').lean();
    if (user?.home_neighborhood) {
      await ensureDefaultMembershipsForNeighborhoodUsers(user.home_neighborhood, userId);
    }

    const joinedGroups = await mapMemberships(userId);
    return {
      joinedCommunities: joinedGroups,
      suggestedCommunities: []
    };
  },

  async discoverForUser(userId: string): Promise<DiscoverGroupsResponse> {
    return this.discoverForUserInNeighborhood(userId);
  },

  async discoverForUserInNeighborhood(userId: string, neighborhoodOverride?: string): Promise<DiscoverGroupsResponse> {
    const user = await User.findById(userId).select('home_neighborhood').lean();
    if (!user?.home_neighborhood) {
      throw new HttpError(400, 'User has no neighborhood yet');
    }

    const neighborhoodName = neighborhoodOverride?.trim() || user.home_neighborhood;
    await ensureNeighborhoodStandardGroups(neighborhoodName, userId);
    if (neighborhoodName === user.home_neighborhood) {
      await ensureDefaultMembershipsForNeighborhoodUsers(neighborhoodName, userId);
    }

    const [joinedGroups, standardGroups, publicCustomGroups, friends] = await Promise.all([
      mapMemberships(userId),
      Community.find({
        neighborhood_name: neighborhoodName,
        group_kind: 'standard',
        state: 'active'
      })
        .sort({ name: 1 })
        .lean(),
      Community.find({
        neighborhood_name: neighborhoodName,
        group_kind: 'custom',
        visibility: 'public',
        state: 'active'
      })
        .sort({ name: 1 })
        .lean(),
      mapFriends(userId)
    ]);

    const joinedGroupIds = new Set(joinedGroups.map((group) => group.id));

    return {
      neighborhoodName,
      joinedGroups,
      standardGroups: standardGroups.map((community) => ({
        id: String(community._id),
        name: community.name,
        slug: community.slug,
        description: community.description,
        membersCount: community.members_count,
        visibility: community.visibility,
        groupKind: community.group_kind,
        neighborhoodName: community.neighborhood_name,
        canDelete: canDeleteCommunity(community, userId),
        canLeave: canLeaveCommunity(community)
      })),
      publicGroups: publicCustomGroups
        .filter((community) => !joinedGroupIds.has(String(community._id)))
        .map((community) => ({
          id: String(community._id),
          name: community.name,
          slug: community.slug,
          description: community.description,
          membersCount: community.members_count,
          visibility: community.visibility,
          groupKind: community.group_kind,
          neighborhoodName: community.neighborhood_name,
          canDelete: canDeleteCommunity(community, userId),
          canLeave: canLeaveCommunity(community)
        })),
      friends
    };
  },

  async joinGroup(userId: string, communityId: string) {
    const community = await Community.findById(communityId);
    if (!community || community.state !== 'active') {
      throw new HttpError(404, 'Group not found');
    }
    if (community.visibility === 'private') {
      throw new HttpError(403, 'Private groups require an invitation');
    }

    const existing = await CommunityMembership.findOne({ community_id: community._id, user_id: userId });
    if (!existing) {
      await CommunityMembership.create({
        community_id: community._id,
        user_id: userId,
        role: 'member',
        status: 'active',
        joined_at: new Date()
      });

      community.members_count += 1;
      await community.save();
    } else if (existing.status !== 'active') {
      existing.status = 'active';
      existing.joined_at = new Date();
      await existing.save();
    }

    return { joined: true, communityId: String(community._id) };
  },

  async getGroupDetail(userId: string, communityId: string): Promise<GroupDetailResponse> {
    const community = await Community.findById(communityId).lean();
    if (!community || community.state !== 'active') {
      throw new HttpError(404, 'Group not found');
    }

    const membership = await getActiveMembership(userId, communityId);
    if (community.visibility === 'private' && !membership) {
      throw new HttpError(403, 'Private group is visible only to members');
    }

    return {
      group: {
        id: String(community._id),
        name: community.name,
        slug: community.slug,
        description: community.description,
        membersCount: community.members_count,
        role: membership?.role,
        visibility: community.visibility,
        groupKind: community.group_kind,
        neighborhoodName: community.neighborhood_name,
        canDelete: canDeleteCommunity(community, userId),
        canLeave: canLeaveCommunity(community, membership)
      },
      joined: Boolean(membership),
      canViewMembers: Boolean(membership)
    };
  },

  async getGroupChat(userId: string, communityId: string): Promise<GroupChatResponse> {
    const { community, membership } = await requireGroupAccess(userId, communityId);
    const messages = await CommunityMessage.find({ community_id: communityId })
      .sort({ created_at: 1 })
      .limit(200)
      .lean();

    return {
      group: {
        id: String(community._id),
        name: community.name,
        slug: community.slug,
        description: community.description,
        membersCount: community.members_count,
        role: membership.role,
        visibility: community.visibility,
        groupKind: community.group_kind,
        neighborhoodName: community.neighborhood_name,
        canDelete: canDeleteCommunity(community, userId),
        canLeave: canLeaveCommunity(community, membership)
      },
      canViewMembers: true,
      messages: messages.map((message) => ({
        id: String(message._id),
        userId: message.user_id,
        userName: message.user_name,
        userPhotoBase64: message.user_photo_base64 || ensureStoredProfilePhoto({ fullName: message.user_name, fallbackLabel: message.user_id }),
        text: message.text,
        imageBase64: message.image_base64,
        createdAt: message.created_at.toISOString(),
        isOwnMessage: message.user_id === userId
      }))
    };
  },

  async sendGroupMessage(
    userId: string,
    communityId: string,
    payload: { text?: string; imageBase64?: string }
  ): Promise<GroupChatMessage> {
    await requireGroupAccess(userId, communityId);
    const user = await User.findById(userId)
      .select('full_name verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 document_number show_photo_to_others')
      .lean();

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const text = payload.text?.trim();
    const imageBase64 = payload.imageBase64?.trim();
    if (!text && !imageBase64) {
      throw new HttpError(400, 'Message text or image is required');
    }

    const saved = await CommunityMessage.create({
      community_id: communityId,
      user_id: userId,
      user_name: user.full_name || user.document_number || userId,
      user_photo_base64: resolveVisibleProfilePhoto({
        fullName: user.full_name,
        profilePhotoBase64:
          user.verified_profile_photo_base64 ||
          (user.profile_photo_base64 && !isGeneratedAvatarDataUri(user.profile_photo_base64)
            ? user.profile_photo_base64
            : undefined) ||
          user.avatar_photo_base64,
        showPhotoToOthers: user.show_photo_to_others,
        fallbackLabel: user.document_number || userId
      }),
      text,
      image_base64: imageBase64
    });

    return {
      id: String(saved._id),
      userId,
      userName: saved.user_name,
      userPhotoBase64: saved.user_photo_base64,
      text: saved.text,
      imageBase64: saved.image_base64,
      createdAt: saved.created_at.toISOString(),
      isOwnMessage: true
    };
  },

  async createGroup(
    userId: string,
    payload: { name: string; description?: string; memberUserIds?: string[]; visibility?: 'public' | 'private' }
  ) {
    const name = payload.name.trim();
    if (!name) {
      throw new HttpError(400, 'name is required');
    }

    const visibility = payload.visibility === 'private' ? 'private' : 'public';
    const uniqueMemberIds = Array.from(new Set((payload.memberUserIds || []).filter(Boolean)));
    const friends = await mapFriends(userId);
    const friendIds = new Set(friends.map((friend) => friend.userId));
    const creator = await User.findById(userId).select('home_neighborhood').lean();

    if (!creator?.home_neighborhood) {
      throw new HttpError(400, 'User has no neighborhood yet');
    }

    if (visibility === 'private') {
      for (const memberId of uniqueMemberIds) {
        if (!friendIds.has(memberId)) {
          throw new HttpError(400, 'Private groups can include only accepted friends');
        }
      }
    }

    const community = await Community.create({
      name,
      slug: `${buildSlug(name)}-${Date.now()}`,
      description: payload.description?.trim(),
      created_by_user_id: userId,
      neighborhood_name: creator.home_neighborhood,
      group_kind: 'custom',
      visibility,
      state: 'active',
      members_count: 1
    });

    await ensureCommunitySettings(String(community._id), userId);

    await CommunityMembership.create({
      community_id: community._id,
      user_id: userId,
      role: 'owner',
      status: 'active',
      joined_at: new Date()
    });

    if (visibility === 'private' && uniqueMemberIds.length) {
      for (const memberId of uniqueMemberIds) {
        await CommunityInvite.findOneAndUpdate(
          {
            community_id: community._id,
            inviter_user_id: userId,
            invitee_user_id: memberId
          },
          {
            community_id: community._id,
            inviter_user_id: userId,
            invitee_user_id: memberId,
            status: 'pending',
            expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
            responded_at: undefined
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    return {
      id: String(community._id),
      name: community.name,
      slug: community.slug,
      visibility: community.visibility
    };
  },

  async getGroupMembers(userId: string, communityId: string): Promise<GroupMembersResponse> {
    const { community, membership } = await requireGroupAccess(userId, communityId);
    const [memberships, pendingInvites, friends] = await Promise.all([
      CommunityMembership.find({
        community_id: communityId,
        status: 'active'
      })
        .select('user_id role status')
        .lean(),
      CommunityInvite.find({
        community_id: communityId,
        status: 'pending',
        expires_at: { $gt: new Date() }
      })
        .select('invitee_user_id')
        .lean(),
      mapFriends(userId)
    ]);

    const users = await User.find({ _id: { $in: memberships.map((entry) => entry.user_id) } })
      .select('full_name bio verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 show_photo_to_others')
      .lean();

    const memberIds = new Set(memberships.map((entry) => entry.user_id));
    const pendingInviteIds = new Set(pendingInvites.map((invite) => invite.invitee_user_id));

    return {
      group: {
        id: String(community._id),
        name: community.name,
        slug: community.slug,
        description: community.description,
        membersCount: community.members_count,
        role: membership.role,
        visibility: community.visibility,
        groupKind: community.group_kind,
        neighborhoodName: community.neighborhood_name,
        canDelete: canDeleteCommunity(community, userId),
        canLeave: canLeaveCommunity(community, membership)
      },
      requesterRole: membership.role,
      members: memberships.map((entry) => {
        const user = users.find((candidate) => String(candidate._id) === entry.user_id);
        return {
          userId: entry.user_id,
          fullName: user?.full_name || entry.user_id,
          role: entry.role,
          status: entry.status,
          bio: user?.bio,
          photoBase64: resolveVisibleProfilePhoto({
            fullName: user?.full_name,
            profilePhotoBase64:
              user?.verified_profile_photo_base64 ||
              (user?.profile_photo_base64 && !isGeneratedAvatarDataUri(user.profile_photo_base64)
                ? user.profile_photo_base64
                : undefined) ||
              user?.avatar_photo_base64,
            showPhotoToOthers: user?.show_photo_to_others,
            fallbackLabel: entry.user_id
          })
        };
      }),
      invitableFriends:
        community.visibility === 'private' && (membership.role === 'owner' || membership.role === 'admin')
          ? friends.filter((friend) => !memberIds.has(friend.userId) && !pendingInviteIds.has(friend.userId))
          : []
    };
  },

  async promoteMemberToAdmin(userId: string, communityId: string, memberUserId: string) {
    const { community, membership } = await requireGroupAccess(userId, communityId);
    if (community.visibility !== 'private') {
      throw new HttpError(400, 'Only private groups support manual admin promotion');
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HttpError(403, 'Only group admins can promote members');
    }

    const targetMembership = await CommunityMembership.findOne({
      community_id: communityId,
      user_id: memberUserId,
      status: 'active'
    });

    if (!targetMembership) {
      throw new HttpError(404, 'Member not found in group');
    }

    targetMembership.role = 'admin';
    await targetMembership.save();

    return { promoted: true, memberUserId };
  },

  async inviteToPrivateGroup(userId: string, communityId: string, invitedUserId: string) {
    const { community, membership } = await requireGroupAccess(userId, communityId);
    if (community.visibility !== 'private') {
      throw new HttpError(400, 'Only private groups support invites');
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HttpError(403, 'Only group admins can invite members');
    }

    const friends = await mapFriends(userId);
    if (!friends.some((friend) => friend.userId === invitedUserId)) {
      throw new HttpError(400, 'You can invite only accepted friends');
    }

    const existingMembership = await CommunityMembership.findOne({
      community_id: communityId,
      user_id: invitedUserId,
      status: 'active'
    });

    if (existingMembership) {
      return { invited: true, alreadyMember: true };
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    await CommunityInvite.findOneAndUpdate(
      {
        community_id: communityId,
        inviter_user_id: userId,
        invitee_user_id: invitedUserId
      },
      {
        community_id: communityId,
        inviter_user_id: userId,
        invitee_user_id: invitedUserId,
        status: 'pending',
        expires_at: expiresAt,
        responded_at: undefined
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { invited: true, invitedUserId };
  },

  async getPendingGroupInvites(userId: string): Promise<PendingGroupInvite[]> {
    const invites = await CommunityInvite.find({
      invitee_user_id: userId,
      status: 'pending',
      expires_at: { $gt: new Date() }
    }).lean();

    const [communities, inviters] = await Promise.all([
      invites.length
        ? Community.find({ _id: { $in: invites.map((invite) => invite.community_id) } })
            .select('name')
            .lean()
        : [],
      invites.length
        ? User.find({ _id: { $in: invites.map((invite) => invite.inviter_user_id) } })
            .select('full_name')
            .lean()
        : []
    ]);

    return invites.map((invite) => ({
      inviteId: String(invite._id),
      communityId: String(invite.community_id),
      groupName:
        communities.find((community) => String(community._id) === String(invite.community_id))?.name ||
        String(invite.community_id),
      inviterUserId: invite.inviter_user_id,
      inviterName:
        inviters.find((user) => String(user._id) === invite.inviter_user_id)?.full_name ||
        invite.inviter_user_id
    }));
  },

  async respondToGroupInvite(userId: string, inviteId: string, accept: boolean) {
    const invite = await CommunityInvite.findOne({
      _id: inviteId,
      invitee_user_id: userId,
      status: 'pending'
    });

    if (!invite) {
      throw new HttpError(404, 'Group invitation not found');
    }

    invite.status = accept ? 'accepted' : 'declined';
    invite.responded_at = new Date();
    await invite.save();

    if (!accept) {
      return { accepted: false };
    }

    const existingMembership = await CommunityMembership.findOne({
      community_id: invite.community_id,
      user_id: userId
    });

    if (!existingMembership) {
      await CommunityMembership.create({
        community_id: invite.community_id,
        user_id: userId,
        role: 'member',
        status: 'active',
        invited_by_user_id: invite.inviter_user_id,
        approved_by_user_id: invite.inviter_user_id,
        joined_at: new Date()
      });
      await Community.findByIdAndUpdate(invite.community_id, { $inc: { members_count: 1 } });
    } else if (existingMembership.status !== 'active') {
      existingMembership.status = 'active';
      existingMembership.role = 'member';
      existingMembership.invited_by_user_id = invite.inviter_user_id;
      existingMembership.approved_by_user_id = invite.inviter_user_id;
      existingMembership.joined_at = new Date();
      await existingMembership.save();
    }

    return { accepted: true, communityId: String(invite.community_id) };
  },

  async leaveGroup(userId: string, communityId: string) {
    const { community, membership } = await requireGroupAccess(userId, communityId);

    if (!canLeaveCommunity(community, membership)) {
      throw new HttpError(400, 'You cannot leave this group');
    }

    if (membership.role === 'owner') {
      const otherActiveMembers = await CommunityMembership.countDocuments({
        community_id: communityId,
        user_id: { $ne: userId },
        status: 'active'
      });
      if (otherActiveMembers > 0) {
        throw new HttpError(400, 'Transfer or delete the group before leaving it');
      }
    }

    await CommunityMembership.updateOne(
      { community_id: communityId, user_id: userId, status: 'active' },
      { status: 'left', left_at: new Date() }
    );
    await Community.findByIdAndUpdate(communityId, { $inc: { members_count: -1 } });

    return { left: true, communityId };
  },

  async deleteGroup(userId: string, communityId: string) {
    const { community } = await requireGroupAccess(userId, communityId);

    if (!canDeleteCommunity(community, userId)) {
      throw new HttpError(403, 'Only the creator can delete this group');
    }

    await Community.findByIdAndUpdate(communityId, { state: 'archived' });
    await CommunityMembership.updateMany(
      { community_id: communityId, status: 'active' },
      { status: 'left', left_at: new Date() }
    );
    await CommunityInvite.updateMany(
      { community_id: communityId, status: 'pending' },
      { status: 'revoked', responded_at: new Date() }
    );

    return { deleted: true, communityId };
  }
};
