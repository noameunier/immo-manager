import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Banner, Badge, Button, Card, PageTitle, Row, Screen } from '@/components/ui';
import { apiRequest, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';
import { colors, spacing } from '@/lib/theme';

export default function ProfileScreen() {
  const { user, token, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resendVerification() {
    if (!token) return;
    setResending(true);
    setMessage(null);
    try {
      await apiRequest('/auth/verification/resend', { method: 'POST', token });
      setMessage('Un nouvel email de vérification a été envoyé.');
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error));
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/connexion');
  }

  if (!user) return null;

  return (
    <Screen>
      <PageTitle title="Profil" subtitle="Informations de votre compte et sécurité." />

      <Card>
        <Text style={styles.sectionTitle}>Compte</Text>
        <Row label="Nom complet" value={user.fullName} />
        <Row label="Adresse email" value={user.email} />
        <Row label="Email vérifié" value={user.emailVerified ? 'Oui' : 'Non'} />
        <Row label="Compte créé le" value={formatDate(user.createdAt)} />
        <Row label="Langue" value={user.locale} />
        <Row label="Fuseau horaire" value={user.timezone} />
      </Card>

      {!user.emailVerified ? (
        <Card>
          <Text style={styles.sectionTitle}>Vérification de l’adresse email</Text>
          <Text style={styles.text}>
            Votre adresse n’est pas encore confirmée. Vous pouvez demander un nouvel email.
          </Text>
          {message ? <Banner tone="success">{message}</Banner> : null}
          <Button
            label="Renvoyer l’email de vérification"
            variant="secondary"
            loading={resending}
            onPress={resendVerification}
          />
        </Card>
      ) : (
        <Badge label="Adresse email vérifiée" tone="success" />
      )}

      <Card>
        <Text style={styles.sectionTitle}>Sécurité</Text>
        <Text style={styles.text}>
          La session est stockée dans le stockage sécurisé de l’appareil (Keychain iOS, Keystore
          Android) et peut être révoquée à tout moment.
        </Text>
      </Card>

      <Button label="Se déconnecter" variant="secondary" onPress={handleSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  text: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.sm },
});
