import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { PROPERTY_TYPE_LABELS, type Property } from '@immo/shared';
import { Banner, Badge, Button, Card, Loading, PageTitle, Screen } from '@/components/ui';
import { apiRequest, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatSurface } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';

const OCCUPANCY_LABELS = {
  VACANT: 'Vacant',
  OCCUPIED: 'Occupé',
  UNKNOWN: 'Non renseigné',
} as const;

export default function PropertiesScreen() {
  const { token } = useAuth();
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setProperties(await apiRequest<Property[]>('/properties', { token }));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!properties && !error) return <Loading />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <PageTitle title="Mes biens" subtitle="Lots rattachés à un immeuble et biens indépendants." />

      {error ? (
        <View>
          <Banner tone="error">{error}</Banner>
          <Button label="Réessayer" variant="secondary" onPress={handleRefresh} />
        </View>
      ) : null}

      {properties && properties.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>Aucun bien pour le moment</Text>
          <Text style={styles.emptyText}>
            Créez vos biens depuis le site web : l’application mobile les affichera automatiquement.
          </Text>
        </Card>
      ) : null}

      {properties?.map((property) => (
        <Link key={property.id} href={`/biens/${property.id}`} asChild>
          <Pressable>
            <Card>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{property.name}</Text>
                <Badge label={PROPERTY_TYPE_LABELS[property.type]} />
              </View>
              <Text style={styles.meta}>
                {property.entity?.name ?? 'Entité inconnue'} ·{' '}
                {property.building ? property.building.name : 'Bien indépendant'}
              </Text>
              <Text style={styles.meta}>
                {property.lotNumber ? `Lot ${property.lotNumber} · ` : ''}
                {formatSurface(property.surfaceM2)}
                {property.rooms ? ` · ${property.rooms} pièce(s)` : ''}
              </Text>
              <View style={styles.footerRow}>
                <Badge
                  label={OCCUPANCY_LABELS[property.occupancyStatus]}
                  tone={property.occupancyStatus === 'OCCUPIED' ? 'brand' : 'neutral'}
                />
                <Text style={styles.detailLink}>Voir la fiche →</Text>
              </View>
              {property.archivedAt ? <Badge label="Archivé" /> : null}
            </Card>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
  meta: { marginTop: spacing.xs, fontSize: 13, color: colors.textMuted },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  detailLink: { fontSize: 13, color: colors.brand, fontWeight: '600' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  emptyText: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
});
