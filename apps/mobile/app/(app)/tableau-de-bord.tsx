import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { DashboardSummary } from '@immo/shared';
import { OCCUPANCY_STATUS_LABELS, OWNER_ENTITY_TYPE_LABELS } from '@immo/shared';
import { Banner, Button, Card, Loading, PageTitle, Screen } from '@/components/ui';
import { apiRequest, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatNumber, formatSurface } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';

export default function DashboardScreen() {
  const { user, token, signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setSummary(await apiRequest<DashboardSummary>('/dashboard/summary', { token }));
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

  if (!summary && !error) return <Loading />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <PageTitle
        title={`Bonjour, ${user?.fullName.split(' ')[0] ?? ''}`}
        subtitle="Voici l’état de votre patrimoine."
      />

      {error ? (
        <View>
          <Banner tone="error">{error}</Banner>
          <Button label="Réessayer" variant="secondary" onPress={handleRefresh} />
        </View>
      ) : null}

      {summary ? (
        <>
          <View style={styles.metrics}>
            <Card>
              <Text style={styles.metricLabel}>Entités</Text>
              <Text style={styles.metricValue}>{formatNumber(summary.entities.total)}</Text>
            </Card>
            <Card>
              <Text style={styles.metricLabel}>Immeubles</Text>
              <Text style={styles.metricValue}>{formatNumber(summary.buildings.total)}</Text>
            </Card>
            <Card>
              <Text style={styles.metricLabel}>Biens</Text>
              <Text style={styles.metricValue}>{formatNumber(summary.properties.total)}</Text>
              <Text style={styles.metricHint}>
                {formatNumber(summary.properties.lots)} lot(s) ·{' '}
                {formatNumber(summary.properties.independent)} indépendant(s)
              </Text>
            </Card>
            <Card>
              <Text style={styles.metricLabel}>Surface totale</Text>
              <Text style={styles.metricValue}>
                {formatSurface(summary.properties.totalSurfaceM2)}
              </Text>
            </Card>
          </View>

          {summary.properties.total === 0 ? (
            <Banner tone="info">
              Votre patrimoine est vide. Ajoutez vos biens depuis le site web ou l’application.
            </Banner>
          ) : null}

          <Card>
            <Text style={styles.sectionTitle}>Entités par type</Text>
            {Object.entries(OWNER_ENTITY_TYPE_LABELS).map(([type, label]) => (
              <View key={type} style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>
                  {summary.entities.byType[type as keyof typeof summary.entities.byType]}
                </Text>
              </View>
            ))}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Occupation des biens</Text>
            {Object.entries(OCCUPANCY_STATUS_LABELS).map(([status, label]) => (
              <View key={status} style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>
                  {
                    summary.properties.byOccupancy[
                      status as keyof typeof summary.properties.byOccupancy
                    ]
                  }
                </Text>
              </View>
            ))}
          </Card>

          <Text style={styles.footer}>
            Données au {new Date(summary.generatedAt).toLocaleString('fr-FR')}
          </Text>
        </>
      ) : null}

      <Button label="Se déconnecter" variant="secondary" onPress={() => signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  metricLabel: { fontSize: 13, color: colors.textMuted },
  metricValue: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  metricHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
