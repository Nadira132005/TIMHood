#!/usr/bin/env python3
import argparse
import copy
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Tuple

Feature = Dict[str, Any]
FeatureCollection = Dict[str, Any]


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.replace("+", " ")
    value = re.sub(r"[\s/_-]+", " ", value)
    return value.strip().lower()


def prettify_label(value: str) -> str:
    value = value.replace("+", " ")
    value = re.sub(r"\s+", " ", value).strip()
    # title-case with a few sensible exceptions left untouched if already uppercase-ish
    return " ".join(
        part if part.isupper() else part.capitalize() for part in value.split()
    )


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.replace("+", " ")
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def round_number(value: Any, places: int = 7) -> Any:
    if isinstance(value, float):
        return round(value, places)
    if isinstance(value, list):
        return [round_number(x, places) for x in value]
    return value


def close_ring(ring: List[List[float]]) -> List[List[float]]:
    if not ring:
        return ring
    if ring[0] != ring[-1]:
        return ring + [ring[0]]
    return ring


def normalize_polygon_coords(
    coords: List[List[List[float]]],
) -> List[List[List[float]]]:
    normalized = []
    for ring in coords:
        normalized_ring = [[float(pt[0]), float(pt[1])] for pt in ring]
        normalized_ring = close_ring(normalized_ring)
        normalized.append(round_number(normalized_ring))
    return normalized


def normalize_multipolygon_coords(
    coords: List[List[List[List[float]]]],
) -> List[List[List[List[float]]]]:
    return [normalize_polygon_coords(polygon) for polygon in coords]


def normalize_geometry(geometry: Dict[str, Any]) -> Dict[str, Any]:
    geometry = copy.deepcopy(geometry)
    gtype = geometry.get("type")
    coords = geometry.get("coordinates", [])

    if gtype == "Polygon":
        geometry["coordinates"] = normalize_polygon_coords(coords)
    elif gtype == "MultiPolygon":
        geometry["coordinates"] = normalize_multipolygon_coords(coords)
    else:
        raise ValueError(f"Unsupported geometry type: {gtype}")

    return geometry


def geometry_signature(geometry: Dict[str, Any]) -> str:
    return json.dumps(
        normalize_geometry(geometry), sort_keys=True, separators=(",", ":")
    )


def feature_key(feature: Feature) -> str:
    attrs = feature.get("attributes") or {}
    db_id = attrs.get("db_id")
    geometry_id = feature.get("geometryId")

    if db_id is not None:
        return f"db:{db_id}"
    if geometry_id is not None:
        return f"geom:{geometry_id}"

    label = attrs.get("Eticheta", "")
    if label:
        return f"label:{normalize_text(label)}"

    raise ValueError("Feature has no usable key (db_id, geometryId, or Eticheta)")


def canonicalize_feature(feature: Feature) -> Feature:
    out = copy.deepcopy(feature)
    attrs = out.setdefault("attributes", {})

    raw_label = str(attrs.get("Eticheta", "")).strip()
    pretty_label = prettify_label(raw_label) if raw_label else raw_label

    if raw_label:
        attrs["Eticheta"] = pretty_label
        attrs["label_normalized"] = normalize_text(raw_label)
        attrs["slug"] = slugify(raw_label)

    if "geometry" in out and out["geometry"]:
        out["geometry"] = normalize_geometry(out["geometry"])

    # Ensure IDs have consistent numeric forms if possible
    if attrs.get("db_id") is not None:
        try:
            attrs["db_id"] = int(attrs["db_id"])
        except (TypeError, ValueError):
            pass

    if out.get("geometryId") is not None:
        try:
            out["geometryId"] = int(out["geometryId"])
        except (TypeError, ValueError):
            pass

    return out


def feature_richness_score(feature: Feature) -> Tuple[int, int, int]:
    attrs = feature.get("attributes") or {}
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates") or []

    # crude "how complete is this record?" score
    top_level_non_null = sum(1 for v in feature.values() if v is not None)
    attrs_non_null = sum(1 for v in attrs.values() if v is not None and v != "")
    coord_size = len(json.dumps(coords, separators=(",", ":")))

    return (top_level_non_null, attrs_non_null, coord_size)


def merge_features(
    existing: Feature, incoming: Feature, prefer: str
) -> Tuple[Feature, List[str]]:
    notes: List[str] = []

    ex_label = ((existing.get("attributes") or {}).get("Eticheta") or "").strip()
    in_label = ((incoming.get("attributes") or {}).get("Eticheta") or "").strip()

    if ex_label and in_label and normalize_text(ex_label) != normalize_text(in_label):
        notes.append(f"label mismatch: '{ex_label}' vs '{in_label}'")

    ex_geom = existing.get("geometry")
    in_geom = incoming.get("geometry")
    if (
        ex_geom
        and in_geom
        and geometry_signature(ex_geom) != geometry_signature(in_geom)
    ):
        notes.append("geometry differs")

    if prefer == "first":
        winner = existing
        loser = incoming
    elif prefer == "second":
        winner = incoming
        loser = existing
    else:
        winner = (
            incoming
            if feature_richness_score(incoming) >= feature_richness_score(existing)
            else existing
        )
        loser = existing if winner is incoming else incoming

    merged = copy.deepcopy(winner)

    # fill missing top-level fields from loser
    for key, value in loser.items():
        if key == "attributes":
            continue
        if merged.get(key) in (None, "", [], {}):
            merged[key] = copy.deepcopy(value)

    # merge attributes field-by-field
    merged_attrs = copy.deepcopy((merged.get("attributes") or {}))
    loser_attrs = loser.get("attributes") or {}
    for key, value in loser_attrs.items():
        if merged_attrs.get(key) in (None, "", [], {}):
            merged_attrs[key] = copy.deepcopy(value)
    merged["attributes"] = merged_attrs

    # re-canonicalize after merge
    merged = canonicalize_feature(merged)
    return merged, notes


def load_feature_collection(path: str | Path) -> FeatureCollection:
    path = Path(path)
    data = json.loads(path.read_text(encoding="utf-8"))

    # tolerate "just a list of features"
    if isinstance(data, list):
        return {"type": "FeatureCollection", "features": data}

    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        return data

    raise ValueError(f"{path} is not a FeatureCollection or a feature list")


def merge_feature_collections(
    first: FeatureCollection,
    second: FeatureCollection,
    prefer: str = "richer",
) -> Tuple[FeatureCollection, List[str]]:
    merged_by_key: Dict[str, Feature] = {}
    logs: List[str] = []

    for source_name, fc in [("first", first), ("second", second)]:
        for feature in fc.get("features", []):
            feature = canonicalize_feature(feature)
            key = feature_key(feature)

            if key not in merged_by_key:
                merged_by_key[key] = feature
                continue

            merged, notes = merge_features(merged_by_key[key], feature, prefer=prefer)
            merged_by_key[key] = merged

            for note in notes:
                logs.append(f"[{key}] {note} ({source_name} collided)")

    features = list(merged_by_key.values())

    def sort_key(feature: Feature) -> Tuple[int, int, str]:
        attrs = feature.get("attributes") or {}
        db_id = attrs.get("db_id")
        geometry_id = feature.get("geometryId")
        label = attrs.get("Eticheta", "")
        return (
            int(db_id) if isinstance(db_id, int) else 10**12,
            int(geometry_id) if isinstance(geometry_id, int) else 10**12,
            str(label),
        )

    features.sort(key=sort_key)

    merged_fc: FeatureCollection = {
        "type": "FeatureCollection",
        "features": features,
    }
    return merged_fc, logs


def main() -> None:
    first = load_feature_collection(Path("./neighbourhoods/1.json"))
    second = load_feature_collection(Path("./neighbourhoods/2.json"))

    merged, logs = merge_feature_collections(first, second)

    outfile = Path("./neighbourhoods/final.json")
    outfile.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\n".join(logs) + ("\n" if logs else ""))

    print(
        f"Merged {len(first.get('features', []))} + {len(second.get('features', []))} features"
    )
    print(f"Output features: {len(merged.get('features', []))}")
    print(f"Conflicts logged: {len(logs)}")


if __name__ == "__main__":
    main()
