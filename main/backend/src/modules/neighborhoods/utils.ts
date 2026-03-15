import fs from "fs";
import path from "path";

export type LngLat = [number, number];

export type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    geometryId: number;
    attributes: {
      db_id: number;
      Eticheta: string;
    };
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
  }>;
};

export type NeighborhoodImportRow = {
  id: string;
  sourceId: number;
  name: string;
  slug: string;
  description: string;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  center?: {
    type: "Point";
    coordinates: LngLat;
  };
};

function buildSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[+/_]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeNeighborhoodName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[+/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function prettifyLabel(value: string): string {
  return value.replace(/\+/g, " ").replace(/\s+/g, " ").trim();
}

export function readNeighborhoodDataset(filePath?: string): FeatureCollection {
  const resolvedPath =
    filePath || path.resolve(__dirname, "../../../neighbourhoods/final.json");

  return JSON.parse(fs.readFileSync(resolvedPath, "utf8")) as FeatureCollection;
}

function collectPoints(
  geometry: FeatureCollection["features"][number]["geometry"],
): LngLat[] {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as number[][][]).flat() as LngLat[];
  }

  return (geometry.coordinates as number[][][][]).flat(2) as LngLat[];
}

function computeCenter(
  geometry: FeatureCollection["features"][number]["geometry"],
): { type: "Point"; coordinates: LngLat } | undefined {
  const points = collectPoints(geometry);
  if (!points.length) {
    return undefined;
  }

  const [sumLng, sumLat] = points.reduce(
    ([accLng, accLat], [lng, lat]) => [accLng + lng, accLat + lat],
    [0, 0],
  );

  return {
    type: "Point",
    coordinates: [sumLng / points.length, sumLat / points.length],
  };
}

export function mapDatasetToNeighborhoodRows(
  dataset: FeatureCollection,
): NeighborhoodImportRow[] {
  return dataset.features.map((feature) => {
    const name = prettifyLabel(feature.attributes.Eticheta);

    return {
      id: String(feature.attributes.db_id),
      sourceId: feature.attributes.db_id,
      name,
      slug: buildSlug(name),
      description: `Cartierul ${name} din Timisoara, conform hartii oficiale a municipiului.`,
      geometry: feature.geometry,
      center: computeCenter(feature.geometry),
    };
  });
}

export function loadNeighborhoodImportRows(
  filePath?: string,
): NeighborhoodImportRow[] {
  return mapDatasetToNeighborhoodRows(readNeighborhoodDataset(filePath));
}
