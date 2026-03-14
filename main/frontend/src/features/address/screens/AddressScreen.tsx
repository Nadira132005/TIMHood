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
  neighborhoodResolutionMode: 'manual_selection';
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
};

export function AddressScreen({ profile, onBack, onCompleted }: Props) {
  const { width } = useWindowDimensions();
  const [addressLabel, setAddressLabel] = useState(profile.homeAddressLabel ?? '');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(profile.homeNeighborhood ?? '');
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const sortedNeighborhoods = [...neighborhoods].sort((a, b) => a.name.localeCompare(b.name));
  const mapBaseWidth = 360;
  const mapBaseHeight = 440;
  const mapInnerWidth = Math.max(240, width - 64);
  const mapScale = mapInnerWidth / mapBaseWidth;
  const mapHeight = mapExpanded ? mapBaseHeight * mapScale * 1.15 : mapBaseHeight * mapScale;

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

    loadNeighborhoods();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleContinue() {
    const trimmedAddress = addressLabel.trim();
    const trimmedNeighborhood = selectedNeighborhood.trim();

    if (!trimmedAddress) {
      setError('Enter the address.');
      return;
    }

    if (!trimmedNeighborhood) {
      setError('Select the neighborhood from the list.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await apiPost<AddressResponse>(
        '/identity/home-address',
        {
          addressLabel: trimmedAddress,
          neighborhood: trimmedNeighborhood
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
            The selected neighborhood becomes your local group. You will get a shared chat with everyone registered in the same area.
          </Text>
        </View>

        <SectionCard title="Home Address">
          <Text style={styles.label}>Address</Text>
          <TextInput
            value={addressLabel}
            onChangeText={setAddressLabel}
            placeholder="Strada, numar, reper"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={!busy}
          />
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
                <Text style={styles.mapTitle}>Neighborhood map</Text>
                <View style={[styles.mapCanvas, { height: mapHeight }]}>
                  {neighborhoods.map((neighborhood) => {
                    const active = selectedNeighborhood === neighborhood.name;

                    return (
                      <Pressable
                        key={neighborhood.id}
                        onPress={() => setSelectedNeighborhood(neighborhood.name)}
                        style={[
                          styles.zoneShape,
                          {
                            top: neighborhood.mapTop * mapScale,
                            left: neighborhood.mapLeft * mapScale,
                            width: neighborhood.mapWidth * mapScale,
                            height: neighborhood.mapHeight * mapScale
                          },
                          active && styles.zoneShapeActive
                        ]}
                      >
                        <Text style={[styles.zoneLabel, active && styles.zoneLabelActive, { fontSize: Math.max(9, 11 * mapScale) }]}>
                          {neighborhood.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.mapHint}>
                  {selectedNeighborhood
                    ? `This will place you in the ${selectedNeighborhood} neighborhood chat.`
                    : 'Select a neighborhood from the list or tap a zone on the right.'}
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
  loaderBlock: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.sm
  },
  helperText: {
    color: colors.textMuted
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
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  neighborhoodChipText: {
    color: colors.text,
    fontWeight: '700'
  },
  neighborhoodChipTextActive: {
    color: '#ffffff'
  },
  mapCard: {
    borderRadius: 22,
    backgroundColor: '#EEF6F5',
    padding: spacing.md
  },
  mapTitle: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: spacing.sm
  },
  mapCanvas: {
    borderRadius: 18,
    backgroundColor: '#DDECE9',
    position: 'relative',
    overflow: 'hidden'
  },
  zoneShape: {
    position: 'absolute',
    borderRadius: 20,
    backgroundColor: '#BAD8D2',
    borderWidth: 1,
    borderColor: '#8AB8AF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  zoneShapeActive: {
    backgroundColor: '#0D5E57',
    borderColor: '#0D5E57'
  },
  zoneLabel: {
    color: '#144A44',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center'
  },
  zoneLabelActive: {
    color: '#ffffff'
  },
  mapHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    lineHeight: 20
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16
  },
  errorText: {
    marginTop: spacing.sm,
    color: '#B42318',
    lineHeight: 20
  }
});
