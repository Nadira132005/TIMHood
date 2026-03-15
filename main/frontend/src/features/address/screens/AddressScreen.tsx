import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { apiGet, apiPost } from "../../../shared/api/client";
import { FixedIdentityProfile } from "../../../shared/state/session";
import { colors, spacing } from "../../../shared/theme/tokens";
import MapView, { Marker, Polygon } from "react-native-maps";
import { ScreenContainer } from "../../../shared/ui/ScreenContainer";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { TopBar } from "../../../shared/ui/TopBar";

type Props = {
  profile: FixedIdentityProfile;
  onBack(): void;
  onCompleted(profile: FixedIdentityProfile): void;
};

type AddressResponse = {
  userId: string;
  addressLabel: string;
  neighborhood: string | null;
  neighborhoodResolutionMode: "manual_selection" | "coordinate_resolution";
};

type NeighborhoodOption = {
  id: string;
  name: string;
  slug: string;
  description: string;
  mapTop: number;
  mapLeft: number;
  mapWidth: number;
  mapHeight: number;
  polygons: Array<Array<[number, number]>>;
  center: [number, number];
};

type ResolveAddressResponse = {
  addressLabel: string;
  neighborhood: string | null;
  location: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  resolutionMode: "geocoded" | "outside_dataset" | "not_found";
};

const TIMISOARA_REGION = {
  latitude: 45.7489,
  longitude: 21.2087,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

const MAP_PALETTE = [
  "#D66A3D",
  "#0F8C7C",
  "#2F80ED",
  "#E2A93B",
  "#9B51E0",
  "#27AE60",
  "#EB5757",
  "#56CCF2",
];

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function colorForNeighborhood(name: string) {
  const hash = Array.from(name).reduce(
    (accumulator, char) => accumulator + char.charCodeAt(0),
    0,
  );

  return MAP_PALETTE[hash % MAP_PALETTE.length];
}

function neighborhoodCoordinates(neighborhood: NeighborhoodOption) {
  return neighborhood.polygons.flatMap((polygon) =>
    polygon.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
  );
}

function pointIsInsidePolygon(
  point: [number, number],
  polygon: Array<[number, number]>,
) {
  const [longitude, latitude] = point;
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [currentLongitude, currentLatitude] = polygon[index];
    const [previousLongitude, previousLatitude] = polygon[previous];

    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function findNeighborhoodForPoint(
  point: [number, number],
  neighborhoods: NeighborhoodOption[],
) {
  return (
    neighborhoods.find((neighborhood) =>
      neighborhood.polygons.some((polygon) => pointIsInsidePolygon(point, polygon)),
    ) || null
  );
}

export function AddressScreen({ profile, onBack, onCompleted }: Props) {
  const { width } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const [addressLabel, setAddressLabel] = useState(
    profile.homeAddressLabel ?? "",
  );
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    profile.homeNeighborhood ?? "",
  );
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<
    [number, number] | null
  >(null);
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(
    null,
  );

  const sortedNeighborhoods = [...neighborhoods].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const highlightedNeighborhood =
    sortedNeighborhoods.find((item) => item.name === selectedNeighborhood) ||
    null;
  const mapWidth = Math.max(280, width - 64);
  const mapHeight = mapExpanded ? mapWidth * 1.18 : mapWidth * 0.82;
  const mapCoordinates = useMemo(
    () =>
      neighborhoods.flatMap((neighborhood) =>
        neighborhoodCoordinates(neighborhood),
      ),
    [neighborhoods],
  );

  useEffect(() => {
    if (!mapRef.current || mapCoordinates.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(mapCoordinates, {
        edgePadding: {
          top: 48,
          right: 48,
          bottom: 48,
          left: 48,
        },
        animated: true,
      });
    });
  }, [mapCoordinates]);

  useEffect(() => {
    if (!mapRef.current || !highlightedNeighborhood) {
      return;
    }

    const coordinates = neighborhoodCoordinates(highlightedNeighborhood);
    if (resolvedLocation) {
      coordinates.push({
        latitude: resolvedLocation[1],
        longitude: resolvedLocation[0],
      });
    }

    if (coordinates.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 64,
          right: 64,
          bottom: 64,
          left: 64,
        },
        animated: true,
      });
    });
  }, [highlightedNeighborhood, resolvedLocation]);

  async function loadNeighborhoods() {
    setLoadingNeighborhoods(true);
    try {
      const response = await apiGet<NeighborhoodOption[]>("/neighborhoods");
      setNeighborhoods(response);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load neighborhoods.",
      );
    } finally {
      setLoadingNeighborhoods(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    void (async () => {
      setLoadingNeighborhoods(true);
      try {
        const response = await apiGet<NeighborhoodOption[]>("/neighborhoods");
        if (mounted) {
          setNeighborhoods(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load neighborhoods.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingNeighborhoods(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleResolveAddress() {
    const trimmedAddress = addressLabel.trim();
    if (!trimmedAddress) {
      setError("Enter the street or address first.");
      return;
    }

    setResolving(true);
    setError(null);

    try {
      const response = await apiPost<ResolveAddressResponse>(
        "/neighborhoods/resolve-address",
        { addressLabel: trimmedAddress },
        profile.userId,
      );

      setResolvedLocation(response.location?.coordinates ?? null);
      if (response.neighborhood) {
        setSelectedNeighborhood(response.neighborhood);
      }

      console.log({ response });
      if (response.resolutionMode === "geocoded" && response.neighborhood) {
        setResolutionMessage(`Address matched to ${response.neighborhood}.`);
      } else if (response.resolutionMode === "outside_dataset") {
        setResolutionMessage(
          "Address was found, but it is outside the imported neighborhood polygons.",
        );
      } else {
        setResolutionMessage(
          "Street not found. Drop a pin on the map to choose your neighborhood.",
        );
      }
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "Unable to resolve address.",
      );
    } finally {
      setResolving(false);
    }
  }

  async function handleContinue() {
    const trimmedAddress = addressLabel.trim();
    const trimmedNeighborhood = selectedNeighborhood.trim();

    if (!trimmedAddress) {
      setError("Enter the address.");
      return;
    }

    if (!trimmedNeighborhood) {
      setError(
        "Find the neighborhood from the address or drop a pin on the map first.",
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await apiPost<AddressResponse>(
        "/identity/home-address",
        {
          addressLabel: trimmedAddress,
          neighborhood: trimmedNeighborhood,
          location: resolvedLocation
            ? {
                type: "Point",
                coordinates: resolvedLocation,
              }
            : undefined,
        },
        profile.userId,
      );

      onCompleted({
        ...profile,
        homeAddressLabel: response.addressLabel,
        homeNeighborhood: response.neighborhood,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save address.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleMapPress(latitude: number, longitude: number) {
    const nextLocation: [number, number] = [longitude, latitude];
    const matchedNeighborhood = findNeighborhoodForPoint(
      nextLocation,
      sortedNeighborhoods,
    );

    setResolvedLocation(nextLocation);
    setError(null);

    if (!matchedNeighborhood) {
      setSelectedNeighborhood("");
      setResolutionMessage(
        "That pin is outside the supported neighborhood polygons. Drop it inside a highlighted area.",
      );
      return;
    }

    setSelectedNeighborhood(matchedNeighborhood.name);
    setResolutionMessage(`Map pin matched to ${matchedNeighborhood.name}.`);
  }

  return (
    <ScreenContainer scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <TopBar title="Address" leftActionLabel="Back" onLeftAction={onBack} />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Neighborhood Setup</Text>
          <Text style={styles.title}>Choose where you belong</Text>
          <Text style={styles.subtitle}>
            Type your street to auto-detect the neighborhood from coordinates,
            then confirm it with the official neighborhood map.
          </Text>
        </View>

        <SectionCard title="Home Address">
          <Text style={styles.label}>Address</Text>
          <TextInput
            value={addressLabel}
            onChangeText={(value) => {
              setAddressLabel(value);
              setResolutionMessage(null);
              setResolvedLocation(null);
            }}
            placeholder="Strada, numar, reper"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={!busy && !resolving}
          />
          <Pressable
            style={[styles.resolveButton, resolving && styles.buttonDisabled]}
            onPress={handleResolveAddress}
            disabled={resolving || busy}
          >
            {resolving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.resolveButtonText}>
                Find neighborhood from street
              </Text>
            )}
          </Pressable>
          {resolutionMessage ? (
            <Text style={styles.helperSuccess}>{resolutionMessage}</Text>
          ) : null}
        </SectionCard>

        <SectionCard title="Neighborhood">
          {loadingNeighborhoods ? (
            <View style={styles.loaderBlock}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.helperText}>Loading neighborhoods...</Text>
            </View>
          ) : neighborhoods.length === 0 ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorTitle}>
                Neighborhood map could not be loaded
              </Text>
              <Text style={styles.errorText}>
                {error ??
                  "No neighborhoods were returned by the app right now."}
              </Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => void loadNeighborhoods()}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.selectorLayout}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Find your neighborhood</Text>
                <Pressable onPress={() => setMapExpanded((value) => !value)}>
                  <Text style={styles.expandText}>
                    {mapExpanded ? "Minimize map" : "Maximize map"}
                  </Text>
                </Pressable>
              </View>

              {highlightedNeighborhood ? (
                <View style={styles.selectedCard}>
                  <Text style={styles.selectedLabel}>
                    Selected neighborhood
                  </Text>
                  <Text style={styles.selectedTitle}>
                    {highlightedNeighborhood.name}
                  </Text>
                  {resolutionMessage ? (
                    <Text style={styles.selectedBody}>{resolutionMessage}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={[styles.mapCard, { height: mapHeight + 88 }]}>
                <Text style={styles.mapTitle}>Official neighborhood map</Text>
                <View style={styles.container}>
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={TIMISOARA_REGION}
                    onPress={(event) =>
                      handleMapPress(
                        event.nativeEvent.coordinate.latitude,
                        event.nativeEvent.coordinate.longitude,
                      )
                    }
                  >
                    {sortedNeighborhoods.flatMap((neighborhood) => {
                      const strokeColor = colorForNeighborhood(
                        neighborhood.name,
                      );
                      const isSelected =
                        selectedNeighborhood === neighborhood.name;

                      return neighborhood.polygons.map((polygon, index) => (
                        <Polygon
                          key={`${neighborhood.id}-${index}`}
                          coordinates={polygon.map(([longitude, latitude]) => ({
                            latitude,
                            longitude,
                          }))}
                          strokeColor={strokeColor}
                          fillColor={hexToRgba(
                            strokeColor,
                            isSelected ? 0.36 : 0.18,
                          )}
                          strokeWidth={isSelected ? 3 : 1.5}
                        />
                      ));
                    })}
                    {resolvedLocation ? (
                      <Marker
                        coordinate={{
                          latitude: resolvedLocation[1],
                          longitude: resolvedLocation[0],
                        }}
                        title="Resolved address"
                        description={addressLabel.trim() || undefined}
                        pinColor={colors.primary}
                      />
                    ) : null}
                  </MapView>
                </View>

                <Text style={styles.mapHint}>
                  {selectedNeighborhood
                    ? `Selected neighborhood: ${selectedNeighborhood}`
                    : "Resolve your address or drop a pin inside a neighborhood polygon on the map."}
                </Text>
              </View>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, busy && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Save address and neighborhood
              </Text>
            )}
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.lg,
  },
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  hero: {
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    backgroundColor: "#F9FBFC",
  },
  resolveButton: {
    marginTop: spacing.sm,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  resolveButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  loaderBlock: {
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
  },
  errorBlock: {
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3B3AD",
    backgroundColor: "#FFF1EF",
    padding: spacing.md,
  },
  errorTitle: {
    color: "#7A271A",
    fontWeight: "800",
    fontSize: 15,
  },
  helperSuccess: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  selectorLayout: {
    gap: spacing.md,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  listTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  expandText: {
    color: colors.primary,
    fontWeight: "800",
  },
  selectedCard: {
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(15, 140, 124, 0.18)",
  },
  selectedLabel: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  selectedTitle: {
    marginTop: 4,
    color: colors.text,
    fontWeight: "800",
    fontSize: 20,
  },
  selectedBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    lineHeight: 20,
  },
  mapCard: {
    borderRadius: 22,
    backgroundColor: "#F7FAFA",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    height: 400,
  },
  mapTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  mapImage: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: "#FDFEFE",
  },
  mapPlaceholder: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FDFEFE",
    alignItems: "center",
    justifyContent: "center",
  },
  mapHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B42318",
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  errorText: {
    color: "#B42318",
    fontWeight: "600",
    marginTop: spacing.sm,
  },
});
