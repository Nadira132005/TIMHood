type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

type NeighborhoodResolution = {
  neighborhood: string | null;
  resolutionMode: 'pending_dataset';
};

// Placeholder until we import the official Timisoara neighborhood polygons.
export function resolveNeighborhood(_point: GeoPoint): NeighborhoodResolution {
  return {
    neighborhood: null,
    resolutionMode: 'pending_dataset'
  };
}
