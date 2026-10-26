import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PROPERTY_TYPE_LABELS, type Property } from '@immo/shared';
import { Banner, Badge, Button, Card, Loading, Row, Screen } from '@/components/ui';
import { apiRequest, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatSurface } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setError(null);
      setProperty(await apiRequest<Property>(`/properties/${id}`, { token }));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [token, id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function toggleArchive() {
    if (!token || !property) return;

    const archiving = !property.archivedAt;
    const run = async () => {
      setPending(true);
      try {
        const updated = await apiRequest<Property>(
          archiving ? `/properties/${property.id}` : `/properties/${property.id}/restore`,
          { method: archiving ? 'DELETE' : 'POST', token },
        );
        setProperty(updated);
      } catch (caught) {
        Alert.alert('Erreur', errorMessage(caught));
      } finally {
        setPending(false);
      }
    };

    if (!archiving) {
      await run();
      return;
    }

    Alert.alert('Archiver ce bien ?', 'Il restera consultable et pourra être restauré.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', style: 'destructive', onPress: () => void run() },
    ]);
  }

  if (error && !property) {
    return (
      <Screen>
        <Banner tone="error">{error}</Banner>
        <Button label="Retour" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!property) return <Loading />;

  return (
    <Screen>
      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{property.name}</Text>
          <Badge label={PROPERTY_TYPE_LABELS[property.type]} />
        </View>
        <Text style={styles.meta}>
          {property.entity?.name ?? 'Entité inconnue'} ·{' '}
          {property.building ? property.building.name : 'Bien indépendant'}
        </Text>
        {property.archivedAt ? <Badge label="Archivé" /> : null}

        <View style={styles.rows}>
          <Row label="Numéro de lot" value={property.lotNumber ?? '—'} />
          <Row label="Étage" value={property.floor ?? '—'} />
          <Row label="Surface" value={formatSurface(property.surfaceM2)} />
          <Row label="Pièces" value={property.rooms ? String(property.rooms) : '—'} />
          <Row label="Référence" value={property.reference ?? '—'} />
          <Row label="Occupation" value={property.occupancyStatus} />
          <Row label="Créé le" value={formatDate(property.createdAt)} />
          <Row label="Modifié le" value={formatDate(property.updatedAt)} />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Adresse</Text>
        <Text style={styles.address}>
          {property.addressLine1 ?? 'Adresse de l’immeuble'}
          {property.addressLine2 ? `\n${property.addressLine2}` : ''}
          {'\n'}
          {property.postalCode ?? ''} {property.city ?? ''}
        </Text>
        {property.description ? (
          <>
            <Text style={[styles.sectionTitle, styles.descriptionTitle]}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </>
        ) : null}
      </Card>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <Button
        label={property.archivedAt ? 'Restaurer ce bien' : 'Archiver ce bien'}
        variant={property.archivedAt ? 'secondary' : 'danger'}
        loading={pending}
        onPress={toggleArchive}
      />
      <Button label="Retour à la liste" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, flexShrink: 1 },
  meta: { marginTop: spacing.xs, fontSize: 13, color: colors.textMuted },
  rows: { marginTop: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  descriptionTitle: { marginTop: spacing.md },
  address: { fontSize: 14, color: colors.text, lineHeight: 21 },
  description: { fontSize: 14, color: colors.text, lineHeight: 21 },
});
