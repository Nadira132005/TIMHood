import { resolveNeighborhoodSeedByPoint } from "../neighborhoods/utils";

type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

type NeighborhoodResolution = {
  neighborhood: string | null;
  resolutionMode: "polygon_match" | "outside_dataset";
};

export function resolveNeighborhood(point: GeoPoint): NeighborhoodResolution {
  const matched = resolveNeighborhoodSeedByPoint(point.coordinates);
  return {
    neighborhood: matched?.name || null,
    resolutionMode: matched ? "polygon_match" : "outside_dataset",
  };
}
