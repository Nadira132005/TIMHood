import { User } from '../identity/identity.model';
import { isGeneratedAvatarDataUri, resolveVisibleProfilePhoto } from '../../shared/utils/avatar';
import { HttpError } from '../../shared/utils/http-error';
import { DirectMessage, FriendRequest } from './social.model';

type RelationshipStatus = 'self' | 'friends' | 'request_sent' | 'request_received' | 'none';

type RelationshipResponse = {
  targetUserId: string;
  status: RelationshipStatus;
};

type DirectChatMessage = {
  id: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type DirectChatResponse = {
  relationship: RelationshipStatus;
  messages: DirectChatMessage[];
};

type SendDirectMessagePayload = {
  text?: string;
  imageBase64?: string;
};

type PendingFriendRequest = {
  fromUserId: string;
  fullName: string;
  bio?: string;
  photoBase64?: string;
};

type ContactItem = {
  userId: string;
  fullName: string;
  bio?: string;
  photoBase64?: string;
  neighborhood?: string | null;
  relationship: RelationshipStatus;
};

type ContactsResponse = {
  friends: ContactItem[];
  community: ContactItem[];
};

async function getRelationshipStatus(userId: string, targetUserId: string): Promise<RelationshipStatus> {
  if (userId === targetUserId) {
    return 'self';
  }

  const [sent, received] = await Promise.all([
    FriendRequest.findOne({ from_user_id: userId, to_user_id: targetUserId }).lean(),
    FriendRequest.findOne({ from_user_id: targetUserId, to_user_id: userId }).lean()
  ]);

  if (sent?.status === 'accepted' || received?.status === 'accepted') {
    return 'friends';
  }

  if (sent?.status === 'pending') {
    return 'request_sent';
  }

  if (received?.status === 'pending') {
    return 'request_received';
  }

  return 'none';
}

async function ensureTargetUser(targetUserId: string) {
  const targetUser = await User.findById(targetUserId)
    .select('_id full_name document_number')
    .lean();

  if (!targetUser) {
    throw new HttpError(404, 'Target user not found');
  }

  return targetUser;
}

export const socialService = {
  async getPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]> {
    const requests = await FriendRequest.find({
      to_user_id: userId,
      status: 'pending'
    }).lean();

    const senders = requests.length
      ? await User.find({ _id: { $in: requests.map((request) => request.from_user_id) } })
          .select('full_name bio verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 show_photo_to_others')
          .lean()
      : [];

    return requests.map((request) => {
      const sender = senders.find((entry) => String(entry._id) === request.from_user_id);
      return {
        fromUserId: request.from_user_id,
        fullName: sender?.full_name || request.from_user_id,
        bio: sender?.bio,
        photoBase64: resolveVisibleProfilePhoto({
          fullName: sender?.full_name,
          profilePhotoBase64:
            sender?.verified_profile_photo_base64 ||
            (sender?.profile_photo_base64 && !isGeneratedAvatarDataUri(sender.profile_photo_base64)
              ? sender.profile_photo_base64
              : undefined) ||
            sender?.avatar_photo_base64,
          showPhotoToOthers: sender?.show_photo_to_others,
          fallbackLabel: request.from_user_id
        })
      };
    });
  },

  async getRelationship(userId: string, targetUserId: string): Promise<RelationshipResponse> {
    await ensureTargetUser(targetUserId);
    return {
      targetUserId,
      status: await getRelationshipStatus(userId, targetUserId)
    };
  },

  async getContacts(userId: string, query?: string): Promise<ContactsResponse> {
    const user = await User.findById(userId).select('home_neighborhood').lean();
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const relations = await FriendRequest.find({
      $or: [{ from_user_id: userId }, { to_user_id: userId }]
    }).lean();

    const friendIds = relations
      .filter((entry) => entry.status === 'accepted')
      .map((entry) => (entry.from_user_id === userId ? entry.to_user_id : entry.from_user_id));

    const normalizedQuery = (query || '').trim();
    const regex = normalizedQuery ? new RegExp(normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const [friends, community] = await Promise.all([
      friendIds.length
        ? User.find({ _id: { $in: friendIds } })
            .select('full_name bio verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 home_neighborhood show_photo_to_others')
            .sort({ full_name: 1 })
            .lean()
        : Promise.resolve([]),
      user.home_neighborhood
        ? User.find({
            _id: { $ne: userId },
            home_neighborhood: user.home_neighborhood,
            ...(regex ? { full_name: regex } : {})
          })
            .select('full_name bio verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 home_neighborhood show_photo_to_others')
            .sort({ full_name: 1 })
            .limit(25)
            .lean()
        : Promise.resolve([])
    ]);

    const friendIdSet = new Set(friendIds);
    const requestSentSet = new Set(relations.filter((entry) => entry.status === 'pending' && entry.from_user_id === userId).map((entry) => entry.to_user_id));
    const requestReceivedSet = new Set(
      relations.filter((entry) => entry.status === 'pending' && entry.to_user_id === userId).map((entry) => entry.from_user_id)
    );

    const mapContact = (entry: {
      _id: string;
      full_name?: string;
      bio?: string;
      verified_profile_photo_base64?: string;
      avatar_photo_base64?: string;
      profile_photo_base64?: string;
      home_neighborhood?: string;
      show_photo_to_others?: boolean;
    }): ContactItem => ({
      userId: String(entry._id),
      fullName: entry.full_name || String(entry._id),
      bio: entry.bio,
      photoBase64: resolveVisibleProfilePhoto({
        fullName: entry.full_name,
        profilePhotoBase64:
          entry.verified_profile_photo_base64 ||
          (entry.profile_photo_base64 && !isGeneratedAvatarDataUri(entry.profile_photo_base64)
            ? entry.profile_photo_base64
            : undefined) ||
          entry.avatar_photo_base64,
        showPhotoToOthers: entry.show_photo_to_others,
        fallbackLabel: String(entry._id)
      }),
      neighborhood: entry.home_neighborhood ?? null,
      relationship: friendIdSet.has(String(entry._id))
        ? 'friends'
        : requestSentSet.has(String(entry._id))
          ? 'request_sent'
          : requestReceivedSet.has(String(entry._id))
            ? 'request_received'
            : 'none'
    });

    const friendItems = friends.map(mapContact);
    const communityItems = community
      .filter((entry) => !friendIdSet.has(String(entry._id)))
      .map(mapContact);

    return {
      friends: regex ? friendItems.filter((entry) => regex.test(entry.fullName)) : friendItems,
      community: communityItems
    };
  },

  async sendFriendRequest(userId: string, targetUserId: string): Promise<RelationshipResponse> {
    if (userId === targetUserId) {
      throw new HttpError(400, 'You cannot friend yourself');
    }

    await ensureTargetUser(targetUserId);
    const relationship = await getRelationshipStatus(userId, targetUserId);

    if (relationship === 'friends') {
      return { targetUserId, status: 'friends' };
    }

    if (relationship === 'request_sent') {
      return { targetUserId, status: 'request_sent' };
    }

    if (relationship === 'request_received') {
      const existing = await FriendRequest.findOne({
        from_user_id: targetUserId,
        to_user_id: userId,
        status: 'pending'
      });

      if (!existing) {
        throw new HttpError(404, 'Friend request not found');
      }

      existing.status = 'accepted';
      await existing.save();
      return { targetUserId, status: 'friends' };
    }

    await FriendRequest.findOneAndUpdate(
      { from_user_id: userId, to_user_id: targetUserId },
      { from_user_id: userId, to_user_id: targetUserId, status: 'pending' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { targetUserId, status: 'request_sent' };
  },

  async respondToFriendRequest(userId: string, fromUserId: string, accept: boolean): Promise<RelationshipResponse> {
    const request = await FriendRequest.findOne({
      from_user_id: fromUserId,
      to_user_id: userId,
      status: 'pending'
    });

    if (!request) {
      throw new HttpError(404, 'Friend request not found');
    }

    request.status = accept ? 'accepted' : 'rejected';
    await request.save();

    return {
      targetUserId: fromUserId,
      status: accept ? 'friends' : 'none'
    };
  },

  async getDirectChat(userId: string, targetUserId: string): Promise<DirectChatResponse> {
    await ensureTargetUser(targetUserId);
    const relationship = await getRelationshipStatus(userId, targetUserId);

    if (relationship !== 'friends') {
      throw new HttpError(403, 'Private chat is available only after the other user accepts');
    }

    const messages = await DirectMessage.find({
      $or: [
        { from_user_id: userId, to_user_id: targetUserId },
        { from_user_id: targetUserId, to_user_id: userId }
      ]
    })
      .sort({ created_at: 1 })
      .lean();

    return {
      relationship,
      messages: messages.map((message) => ({
        id: String(message._id),
        fromUserId: message.from_user_id,
        toUserId: message.to_user_id,
        text: message.text,
        imageBase64: message.image_base64,
        createdAt: message.created_at.toISOString(),
        isOwnMessage: message.from_user_id === userId
      }))
    };
  },

  async sendDirectMessage(
    userId: string,
    targetUserId: string,
    payload: SendDirectMessagePayload
  ): Promise<DirectChatMessage> {
    await ensureTargetUser(targetUserId);
    const relationship = await getRelationshipStatus(userId, targetUserId);

    if (relationship !== 'friends') {
      throw new HttpError(403, 'Private chat is available only after the other user accepts');
    }

    const text = payload.text?.trim();
    const imageBase64 = payload.imageBase64?.trim();

    if (!text && !imageBase64) {
      throw new HttpError(400, 'Message text or image is required');
    }

    const saved = await DirectMessage.create({
      from_user_id: userId,
      to_user_id: targetUserId,
      text,
      image_base64: imageBase64
    });

    return {
      id: String(saved._id),
      fromUserId: userId,
      toUserId: targetUserId,
      text: saved.text,
      imageBase64: saved.image_base64,
      createdAt: saved.created_at.toISOString(),
      isOwnMessage: true
    };
  }
};
