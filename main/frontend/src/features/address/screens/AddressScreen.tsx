import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';

import { apiGet, apiPost, getApiBaseUrl } from '../../../shared/api/client';
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
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);

  const sortedNeighborhoods = [...neighborhoods].sort((a, b) => a.name.localeCompare(b.name));
  const mapWidth = Math.max(280, width - 64);
  const mapHeight = mapExpanded ? mapWidth * 1.18 : mapWidth * 0.82;

  async function loadNeighborhoods() {
    setLoadingNeighborhoods(true);
    try {
      const response = await apiGet<NeighborhoodOption[]>('/neighborhoods');
      setNeighborhoods(response);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load neighborhoods.');
    } finally {
      setLoadingNeighborhoods(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const apiBaseUrl = await getApiBaseUrl();
        const assetBaseUrl = apiBaseUrl.replace(/\/api\/?$/i, '');
        if (mounted) {
          setMapImageUrl(`${assetBaseUrl}/assets/map.png`);
        }
      } catch {
        if (mounted) {
          setMapImageUrl(null);
        }
      }

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
    })();

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
            Type your street to auto-detect the neighborhood from coordinates, then confirm it with the official neighborhood map.
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
          ) : neighborhoods.length === 0 ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorTitle}>Neighborhood map could not be loaded</Text>
              <Text style={styles.errorText}>{error ?? 'No neighborhoods were returned by the app right now.'}</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadNeighborhoods()}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
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
                {mapImageUrl ? (
                  <Image
                    source={{ uri: mapImageUrl }}
                    resizeMode="contain"
                    style={[styles.mapImage, { height: mapHeight }]}
                  />
                ) : (
                  <View style={[styles.mapPlaceholder, { height: mapHeight }]}>
                    <Text style={styles.helperText}>Map image is not available right now.</Text>
                  </View>
                )}
                <Text style={styles.mapHint}>
                  {selectedNeighborhood
                    ? `Selected neighborhood: ${selectedNeighborhood}`
                    : 'Select a neighborhood from the list after checking the official map image.'}
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
  errorBlock: {
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3B3AD',
    backgroundColor: '#FFF1EF',
    padding: spacing.md
  },
  errorTitle: {
    color: '#7A271A',
    fontWeight: '800',
    fontSize: 15
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
  mapImage: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#FDFEFE'
  },
  mapPlaceholder: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FDFEFE',
    alignItems: 'center',
    justifyContent: 'center'
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
  retryButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B42318'
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  errorText: {
    color: '#B42318',
    fontWeight: '600',
    marginTop: spacing.sm
  }
});
