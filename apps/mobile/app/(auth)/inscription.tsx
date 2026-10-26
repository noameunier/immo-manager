import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { registerSchema } from '@immo/shared';
import { Banner, Button, Field, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing } from '@/lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setErrors({});
    setGlobalError(null);

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    const parsed = registerSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
        ),
      );
      return;
    }

    setSubmitting(true);
    try {
      await signUp(parsed.data);
      router.replace('/tableau-de-bord');
    } catch (error) {
      setGlobalError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Vos données restent privées : chaque compte ne voit que son patrimoine.
          </Text>
        </View>

        {globalError ? <Banner tone="error">{globalError}</Banner> : null}

        <View style={styles.card}>
          <Field
            label="Nom complet"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            placeholder="Camille Dupont"
            error={errors.fullName}
          />
          <Field
            label="Adresse email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="vous@exemple.fr"
            error={errors.email}
          />
          <Field
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="12 caractères minimum"
            error={errors.password}
          />
          <Field
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="••••••••••••"
            error={errors.confirmPassword}
          />

          <Button label="Créer mon compte" onPress={handleSubmit} loading={submitting} />

          <Link href="/connexion" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkText}>
                Déjà inscrit ? <Text style={styles.linkStrong}>Se connecter</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { marginTop: spacing.lg, marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  linkButton: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { fontSize: 14, color: colors.textMuted },
  linkStrong: { color: colors.brand, fontWeight: '600' },
});
