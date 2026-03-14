import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { apiGet, apiPost } from '../../../shared/api/client';
import { FixedIdentityProfile } from '../../../shared/state/session';
import { colors, spacing } from '../../../shared/theme/tokens';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';
import { TopBar } from '../../../shared/ui/TopBar';

type Props = {
  profile: FixedIdentityProfile;
  onBack(): void;
  onCompleted(profile: FixedIdentityProfile): void;
};

type AddressResponse = {
  userId: string;
  addressLabel: string;
  neighborhood: string | null;
  neighborhoodResolutionMode: 'manual_selection' | 'coordinate_resolution';
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
    type: 'Point';
    coordinates: [number, number];
  } | null;
  resolutionMode: 'geocoded' | 'outside_dataset' | 'not_found';
};

export function AddressScreen({ profile, onBack, onCompleted }: Props) {
  const { width } = useWindowDimensions();
  const [addressLabel, setAddressLabel] = useState(profile.homeAddressLabel ?? '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(profile.homeNeighborhood ?? '');
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<[number, number] | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);

  const sortedNeighborhoods = [...neighborhoods].sort((a, b) => a.name.localeCompare(b.name));
  const allPoints = neighborhoods.flatMap((item) => item.polygons.flat()).map(([lng, lat]) => [lng, -lat] as [number, number]);
  const minX = allPoints.length ? Math.min(...allPoints.map(([x]) => x)) : 0;
  const maxX = allPoints.length ? Math.max(...allPoints.map(([x]) => x)) : 100;
  const minY = allPoints.length ? Math.min(...allPoints.map(([, y]) => y)) : 0;
  const maxY = allPoints.length ? Math.max(...allPoints.map(([, y]) => y)) : 100;
  const viewBoxPadding = 0.003;
  const mapWidth = Math.max(280, width - 64);
  const rawMapHeight = maxY - minY || 1;
  const rawMapWidth = maxX - minX || 1;
  const mapAspectRatio = rawMapHeight / rawMapWidth;
  const mapHeight = mapExpanded ? mapWidth * Math.max(0.9, mapAspectRatio) : mapWidth * Math.max(0.65, mapAspectRatio);

  useEffect(() => {
    let mounted = true;

    async function loadNeighborhoods() {
      setLoadingNeighborhoods(true);
      try {
        const response = await apiGet<NeighborhoodOption[]>('/neighborhoods');
        if (mounted) {
          setNeighborhoods(response);
          setError(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load neighborhoods.');
        }
      } finally {
        if (mounted) {
          setLoadingNeighborhoods(false);
        }
      }
    }

    void loadNeighborhoods();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleResolveAddress() {
    const trimmedAddress = addressLabel.trim();
    if (!trimmedAddress) {
      setError('Enter the street or address first.');
      return;
    }

    setResolving(true);
    setError(null);

    try {
      const response = await apiPost<ResolveAddressResponse>(
        '/neighborhoods/resolve-address',
        { addressLabel: trimmedAddress },
        profile.userId
      );

      setResolvedLocation(response.location?.coordinates ?? null);
      if (response.neighborhood) {
        setSelectedNeighborhood(response.neighborhood);
      }

      if (response.resolutionMode === 'geocoded' && response.neighborhood) {
        setResolutionMessage(`Address matched to ${response.neighborhood}.`);
      } else if (response.resolutionMode === 'outside_dataset') {
        setResolutionMessage('Address was found, but it is outside the imported neighborhood polygons.');
      } else {
        setResolutionMessage('Street not found. You can still choose the neighborhood manually on the map.');
      }
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Unable to resolve address.');
    } finally {
      setResolving(false);
    }
  }

  async function handleContinue() {
    const trimmedAddress = addressLabel.trim();
    const trimmedNeighborhood = selectedNeighborhood.trim();

    if (!trimmedAddress) {
      setError('Enter the address.');
      return;
    }

    if (!trimmedNeighborhood) {
      setError('Select the neighborhood from the list or resolve the street first.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await apiPost<AddressResponse>(
        '/identity/home-address',
        {
          addressLabel: trimmedAddress,
          neighborhood: trimmedNeighborhood,
          location: resolvedLocation
            ? {
                type: 'Point',
                coordinates: resolvedLocation
              }
            : undefined
        },
        profile.userId
      );

      onCompleted({
        ...profile,
        homeAddressLabel: response.addressLabel,
        homeNeighborhood: response.neighborhood
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save address.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <TopBar title="Address" leftActionLabel="Back" onLeftAction={onBack} />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Neighborhood Setup</Text>
          <Text style={styles.title}>Choose where you belong</Text>
          <Text style={styles.subtitle}>
            Type your street to auto-detect the neighborhood from coordinates, or tap the real neighborhood polygons on the map.
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
            {resolving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.resolveButtonText}>Find neighborhood from street</Text>}
          </Pressable>
          {resolutionMessage ? <Text style={styles.helperSuccess}>{resolutionMessage}</Text> : null}
        </SectionCard>

        <SectionCard title="Neighborhood">
          {loadingNeighborhoods ? (
            <View style={styles.loaderBlock}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.helperText}>Loading neighborhoods...</Text>
            </View>
          ) : (
            <View style={styles.selectorLayout}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>All neighborhoods ({sortedNeighborhoods.length})</Text>
                <Pressable onPress={() => setMapExpanded((value) => !value)}>
                  <Text style={styles.expandText}>{mapExpanded ? 'Minimize map' : 'Maximize map'}</Text>
                </Pressable>
              </View>

              <View style={styles.listColumn}>
                {sortedNeighborhoods.map((neighborhood) => {
                  const active = selectedNeighborhood === neighborhood.name;

                  return (
                    <Pressable
                      key={neighborhood.id}
                      onPress={() => setSelectedNeighborhood(neighborhood.name)}
                      style={[styles.neighborhoodChip, active && styles.neighborhoodChipActive]}
                    >
                      <Text style={[styles.neighborhoodChipText, active && styles.neighborhoodChipTextActive]}>
                        {neighborhood.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.mapCard}>
                <Text style={styles.mapTitle}>Official neighborhood map</Text>
                <View style={[styles.svgWrap, { height: mapHeight }]}>
                  <Svg
                    width="100%"
                    height="100%"
                    viewBox={`${minX - viewBoxPadding} ${minY - viewBoxPadding} ${rawMapWidth + viewBoxPadding * 2} ${
                      rawMapHeight + viewBoxPadding * 2
                    }`}
                  >
                    {neighborhoods.map((neighborhood) => {
                      const active = selectedNeighborhood === neighborhood.name;

                      return neighborhood.polygons.map((ring, index) => (
                        <Polygon
                          key={`${neighborhood.id}-${index}`}
                          points={ring.map(([lng, lat]) => `${lng},${-lat}`).join(' ')}
                          fill={active ? '#8FD9CA' : '#E6F2EF'}
                          stroke={active ? '#0D5E57' : '#7BA59C'}
                          strokeWidth={0.0005}
                          onPress={() => setSelectedNeighborhood(neighborhood.name)}
                        />
                      ));
                    })}
                    {resolvedLocation ? (
                      <Circle cx={resolvedLocation[0]} cy={-resolvedLocation[1]} r={0.0008} fill="#B42318" />
                    ) : null}
                  </Svg>
                </View>
                <Text style={styles.mapHint}>
                  {selectedNeighborhood
                    ? `Selected neighborhood: ${selectedNeighborhood}`
                    : 'Select a neighborhood from the list or tap a polygon on the map.'}
                </Text>
              </View>
            </View>
          )}

          <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={handleContinue} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save address and neighborhood</Text>
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
    paddingBottom: spacing.lg
  },
  hero: {
    marginBottom: spacing.lg,
    paddingTop: spacing.sm
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  title: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800'
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    backgroundColor: '#F9FBFC'
  },
  resolveButton: {
    marginTop: spacing.sm,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resolveButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  loaderBlock: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.sm
  },
  helperText: {
    color: colors.textMuted
  },
  helperSuccess: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm
  },
  selectorLayout: {
    gap: spacing.md
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  listTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15
  },
  expandText: {
    color: colors.primary,
    fontWeight: '800'
  },
  listColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  neighborhoodChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F7FAFA',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  neighborhoodChipActive: {
    backgroundColor: '#D7F5EE',
    borderColor: '#6DD3C4'
  },
  neighborhoodChipText: {
    color: colors.text,
    fontWeight: '700'
  },
  neighborhoodChipTextActive: {
    color: '#0D5E57'
  },
  mapCard: {
    borderRadius: 22,
    backgroundColor: '#F7FAFA',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  mapTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: spacing.sm
  },
  svgWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FDFEFE'
  },
  mapHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    lineHeight: 20
  },
  primaryButton: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16
  },
  buttonDisabled: {
    opacity: 0.7
  },
  errorText: {
    color: '#B42318',
    fontWeight: '600',
    marginTop: spacing.sm
  }
});
