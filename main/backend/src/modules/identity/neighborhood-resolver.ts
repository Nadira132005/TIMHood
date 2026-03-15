import { findNeighborhoodByCoordinates } from "../neighborhoods/neighborhood-geo";

type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

type NeighborhoodResolution = {
  neighborhood: string | null;
};

export async function resolveNeighborhood(
  point: GeoPoint,
): Promise<NeighborhoodResolution> {
  const matched = await findNeighborhoodByCoordinates(point.coordinates);

  return {
    neighborhood: matched?.name || null,
  };
}
