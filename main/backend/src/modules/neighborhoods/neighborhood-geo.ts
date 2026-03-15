import { Neighborhood, type INeighborhood } from "./neighborhoods.model";

type LngLat = [number, number];

function buildPoint(coordinates: LngLat) {
  return {
    type: "Point" as const,
    coordinates,
  };
}

function swapCoordinates([first, second]: LngLat): LngLat {
  return [second, first];
}

async function findByPoint(
  coordinates: LngLat,
): Promise<Pick<INeighborhood, "_id" | "name"> | null> {
  return Neighborhood.findOne({
    geometry: {
      $geoIntersects: {
        $geometry: buildPoint(coordinates),
      },
    },
  })
    .select("_id name")
    .lean();
}

export async function findNeighborhoodByCoordinates(
  coordinates: LngLat,
): Promise<Pick<INeighborhood, "_id" | "name"> | null> {
  const directMatch = await findByPoint(coordinates);
  if (directMatch) {
    return directMatch;
  }

  // Frontend map clicks are often represented as [lat, lng] instead of GeoJSON [lng, lat].
  const swappedCoordinates = swapCoordinates(coordinates);
  if (
    swappedCoordinates[0] === coordinates[0] &&
    swappedCoordinates[1] === coordinates[1]
  ) {
    return null;
  }

  return findByPoint(swappedCoordinates);
}
