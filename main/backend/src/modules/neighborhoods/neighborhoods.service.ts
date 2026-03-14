import { User } from '../identity/identity.model';
import { HttpError } from '../../shared/utils/http-error';
import { TIMISOARA_NEIGHBORHOODS, findNeighborhoodSeedByName } from './neighborhoods.data';
import { Neighborhood, NeighborhoodMessage } from './neighborhoods.model';

type NeighborhoodListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  source: string;
  mapTop: number;
  mapLeft: number;
  mapWidth: number;
  mapHeight: number;
};

type NeighborhoodChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userDocumentNumber: string;
  userPhotoBase64?: string;
  text?: string;
  imageBase64?: string;
  createdAt: string;
  isOwnMessage: boolean;
};

type NeighborhoodChatResponse = {
  neighborhood: NeighborhoodListItem;
  participantsCount: number;
  messages: NeighborhoodChatMessage[];
};

type SendNeighborhoodMessagePayload = {
  text?: string;
  imageBase64?: string;
};

function mapNeighborhood(doc: {
  _id: string;
  name: string;
  slug: string;
  description: string;
  source: string;
  map_top: number;
  map_left: number;
  map_width: number;
  map_height: number;
}): NeighborhoodListItem {
  return {
    id: doc._id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    source: doc.source,
    mapTop: doc.map_top,
    mapLeft: doc.map_left,
    mapWidth: doc.map_width,
    mapHeight: doc.map_height
  };
}

async function ensureNeighborhoodsSeeded(): Promise<void> {
  await Promise.all(
    TIMISOARA_NEIGHBORHOODS.map((seed) =>
      Neighborhood.findOneAndUpdate(
        { _id: seed.id },
        {
          _id: seed.id,
          name: seed.name,
          slug: seed.slug,
          description: seed.description,
          source: 'https://harta.primariatm.ro/',
          map_top: seed.mapTop,
          map_left: seed.mapLeft,
          map_width: seed.mapWidth,
          map_height: seed.mapHeight
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      )
    )
  );
}

async function getCanonicalNeighborhood(name: string) {
  await ensureNeighborhoodsSeeded();
  const seed = findNeighborhoodSeedByName(name);
  if (!seed) {
    throw new HttpError(400, 'Selected neighborhood is not supported');
  }

  const neighborhood = await Neighborhood.findById(seed.id).lean();
  if (!neighborhood) {
    throw new HttpError(500, 'Neighborhood seed failed');
  }

  return neighborhood;
}

export const neighborhoodsService = {
  async listNeighborhoods(): Promise<NeighborhoodListItem[]> {
    await ensureNeighborhoodsSeeded();
    const neighborhoods = await Neighborhood.find().sort({ name: 1 }).lean();
    return neighborhoods.map(mapNeighborhood);
  },

  async getCanonicalNeighborhoodName(name: string): Promise<string> {
    const neighborhood = await getCanonicalNeighborhood(name);
    return neighborhood.name;
  },

  async getMyNeighborhoodChat(userId: string): Promise<NeighborhoodChatResponse> {
    const user = await User.findById(userId)
      .select('document_number full_name home_neighborhood')
      .lean();

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (!user.home_neighborhood) {
      throw new HttpError(400, 'User has not selected a neighborhood yet');
    }

    const neighborhood = await getCanonicalNeighborhood(user.home_neighborhood);
    const [participantsCount, rawMessages] = await Promise.all([
      User.countDocuments({ home_neighborhood: neighborhood.name }),
      NeighborhoodMessage.find({ neighborhood_id: neighborhood._id })
        .sort({ created_at: -1 })
        .limit(100)
        .lean()
    ]);

    return {
      neighborhood: mapNeighborhood(neighborhood),
      participantsCount,
      messages: rawMessages
        .reverse()
        .map((message) => ({
          id: String(message._id),
          userId: message.user_id,
          userName: message.user_name,
          userDocumentNumber: message.user_document_number,
          userPhotoBase64: message.user_photo_base64,
          text: message.text,
          imageBase64: message.image_base64,
          createdAt: message.created_at.toISOString(),
          isOwnMessage: message.user_id === userId
        }))
    };
  },

  async sendMyNeighborhoodMessage(
    userId: string,
    payload: SendNeighborhoodMessagePayload
  ): Promise<NeighborhoodChatMessage> {
    const user = await User.findById(userId)
      .select('document_number full_name profile_photo_base64 home_neighborhood')
      .lean();

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (!user.home_neighborhood) {
      throw new HttpError(400, 'User has not selected a neighborhood yet');
    }

    const text = payload.text?.trim();
    const imageBase64 = payload.imageBase64?.trim();

    if (!text && !imageBase64) {
      throw new HttpError(400, 'Message text or image is required');
    }

    const neighborhood = await getCanonicalNeighborhood(user.home_neighborhood);
    const savedMessage = await NeighborhoodMessage.create({
      neighborhood_id: neighborhood._id,
      user_id: userId,
      user_name: user.full_name || user.document_number,
      user_document_number: user.document_number || userId,
      user_photo_base64: user.profile_photo_base64,
      text,
      image_base64: imageBase64
    });

    return {
      id: String(savedMessage._id),
      userId,
      userName: savedMessage.user_name,
      userDocumentNumber: savedMessage.user_document_number,
      userPhotoBase64: savedMessage.user_photo_base64,
      text: savedMessage.text,
      imageBase64: savedMessage.image_base64,
      createdAt: savedMessage.created_at.toISOString(),
      isOwnMessage: true
    };
  }
};
