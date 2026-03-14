import fs from 'fs';
import path from 'path';

type DatasetFeature = {
  geometryId: number;
  attributes: {
    db_id: number;
    Eticheta: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
};

type FeatureCollection = {
  type: 'FeatureCollection';
  features: DatasetFeature[];
};

export type LngLat = [number, number];

export type NeighborhoodSeed = {
  id: string;
  name: string;
  slug: string;
  description: string;
  mapTop: number;
  mapLeft: number;
  mapWidth: number;
  mapHeight: number;
  polygons: LngLat[][];
  center: LngLat;
};

type Bounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

let cachedSeeds: NeighborhoodSeed[] | null = null;

function buildSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeNeighborhoodName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[+/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function prettifyLabel(value: string): string {
  return value
    .replace(/\+/g, ' + ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readDataset(): DatasetFeature[] {
  const filePath = path.resolve(__dirname, '../../../neighbourhoods.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as FeatureCollection | DatasetFeature[];

  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw.features)) {
    return raw.features;
  }

  throw new Error('Neighborhood dataset has an unsupported format.');
}

function getBoundsFromRing(ring: LngLat[]): Bounds {
  return ring.reduce<Bounds>(
    (acc, [lng, lat]) => ({
      minLng: Math.min(acc.minLng, lng),
      maxLng: Math.max(acc.maxLng, lng),
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat)
    }),
    {
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY
    }
  );
}

function pointInRing([lng, lat]: LngLat, ring: LngLat[]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    const intersects =
      latI > lat !== latJ > lat &&
      lng < ((lngJ - lngI) * (lat - latI)) / ((latJ - latI) || Number.EPSILON) + lngI;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function buildSeeds(): NeighborhoodSeed[] {
  const features = readDataset();
  const allCoordinates = features.flatMap((feature) => feature.geometry.coordinates.flat());
  const cityBounds = getBoundsFromRing(allCoordinates as LngLat[]);
  const cityWidth = cityBounds.maxLng - cityBounds.minLng || 1;
  const cityHeight = cityBounds.maxLat - cityBounds.minLat || 1;

  return features.map((feature) => {
    const name = prettifyLabel(feature.attributes.Eticheta);
    const slug = buildSlug(name);
    const polygons = feature.geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lng, lat] as LngLat));
    const outerRing = polygons[0] || [];
    const bounds = getBoundsFromRing(outerRing);

    return {
      id: String(feature.attributes.db_id),
      name,
      slug,
      description: `Cartierul ${name} din Timisoara, conform hartii oficiale a municipiului.`,
      mapTop: ((cityBounds.maxLat - bounds.maxLat) / cityHeight) * 100,
      mapLeft: ((bounds.minLng - cityBounds.minLng) / cityWidth) * 100,
      mapWidth: ((bounds.maxLng - bounds.minLng) / cityWidth) * 100,
      mapHeight: ((bounds.maxLat - bounds.minLat) / cityHeight) * 100,
      polygons,
      center: [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2]
    };
  });
}

export function getNeighborhoodSeeds(): NeighborhoodSeed[] {
  if (!cachedSeeds) {
    cachedSeeds = buildSeeds();
  }

  return cachedSeeds;
}

export function findNeighborhoodSeedByName(name: string): NeighborhoodSeed | null {
  const normalized = normalizeNeighborhoodName(name);
  return (
    getNeighborhoodSeeds().find(
      (neighborhood) =>
        normalizeNeighborhoodName(neighborhood.name) === normalized ||
        normalizeNeighborhoodName(neighborhood.slug) === normalized
    ) || null
  );
}

export function resolveNeighborhoodSeedByPoint(point: LngLat): NeighborhoodSeed | null {
  for (const neighborhood of getNeighborhoodSeeds()) {
    for (const ring of neighborhood.polygons) {
      if (pointInRing(point, ring)) {
        return neighborhood;
      }
    }
  }

  return null;
}
