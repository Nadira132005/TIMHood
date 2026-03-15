import { User } from '../identity/identity.model';
import { HttpError } from '../../shared/utils/http-error';
import { ensureStoredProfilePhoto, isGeneratedAvatarDataUri, resolveVisibleProfilePhoto } from '../../shared/utils/avatar';
import {
  getNeighborhoodSeeds,
  LngLat,
  NeighborhoodSeed,
  findNeighborhoodSeedByName,
  resolveNeighborhoodSeedByPoint
} from './neighborhoods.data';
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
  polygons: LngLat[][];
  center: LngLat;
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

type ResolveAddressResponse = {
  addressLabel: string;
  neighborhood: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
  resolutionMode: 'geocoded' | 'outside_dataset' | 'not_found';
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
  const seed = findNeighborhoodSeedByName(doc.name);
  if (!seed) {
    throw new HttpError(500, `Neighborhood geometry is missing for ${doc.name}`);
  }

  return {
    id: doc._id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    source: doc.source,
    mapTop: doc.map_top,
    mapLeft: doc.map_left,
    mapWidth: doc.map_width,
    mapHeight: doc.map_height,
    polygons: seed.polygons,
    center: seed.center
  };
}

async function ensureNeighborhoodsSeeded(): Promise<void> {
  const seeds = getNeighborhoodSeeds();

  await Promise.all(
    seeds.map((seed) =>
      Neighborhood.findOneAndUpdate(
        {
          $or: [{ _id: seed.id }, { name: seed.name }, { slug: seed.slug }]
        },
        {
          $set: {
            name: seed.name,
            slug: seed.slug,
            description: seed.description,
            source: 'https://harta.primariatm.ro/',
            map_top: seed.mapTop,
            map_left: seed.mapLeft,
            map_width: seed.mapWidth,
            map_height: seed.mapHeight
          },
          $setOnInsert: {
            _id: seed.id
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true
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

  const neighborhood = await Neighborhood.findOne({
    $or: [{ _id: seed.id }, { name: seed.name }, { slug: seed.slug }]
  }).lean();
  if (!neighborhood) {
    throw new HttpError(500, 'Neighborhood seed failed');
  }

  return neighborhood;
}

async function geocodeAddress(addressLabel: string): Promise<[number, number] | null> {
  const searchUrl = new URL('https://nominatim.openstreetmap.org/search');
  searchUrl.searchParams.set('format', 'jsonv2');
  searchUrl.searchParams.set('limit', '1');
  searchUrl.searchParams.set('countrycodes', 'ro');
  searchUrl.searchParams.set('q', `${addressLabel}, Timisoara, Romania`);

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'TimHood/0.1 neighborhood resolver',
      'Accept-Language': 'ro,en'
    }
  });

  if (!response.ok) {
    throw new HttpError(502, 'Unable to geocode address right now');
  }

  const results = (await response.json()) as Array<{ lon: string; lat: string }>;
  if (!results.length) {
    return null;
  }

  return [Number(results[0].lon), Number(results[0].lat)];
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

  async resolveAddress(addressLabel: string): Promise<ResolveAddressResponse> {
    const trimmedAddress = addressLabel.trim();
    if (!trimmedAddress) {
      throw new HttpError(400, 'addressLabel is required');
    }

    const coordinates = await geocodeAddress(trimmedAddress);
    if (!coordinates) {
      return {
        addressLabel: trimmedAddress,
        neighborhood: null,
        location: null,
        resolutionMode: 'not_found'
      };
    }

    const matched = resolveNeighborhoodSeedByPoint(coordinates);
    return {
      addressLabel: trimmedAddress,
      neighborhood: matched?.name || null,
      location: {
        type: 'Point',
        coordinates
      },
      resolutionMode: matched ? 'geocoded' : 'outside_dataset'
    };
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
          userPhotoBase64: message.user_photo_base64 || ensureStoredProfilePhoto({ fullName: message.user_name, fallbackLabel: message.user_id }),
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
      .select('document_number full_name verified_profile_photo_base64 avatar_photo_base64 profile_photo_base64 home_neighborhood show_photo_to_others')
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
