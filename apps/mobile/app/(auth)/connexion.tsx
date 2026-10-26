import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { loginSchema } from '@immo/shared';
import { Button, Field, Screen, Banner } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setErrors({});
    setGlobalError(null);

    const parsed = loginSchema.safeParse({ email, password });
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
      await signIn(parsed.data);
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
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>IM</Text>
          </View>
          <Text style={styles.appName}>Immo Manager</Text>
          <Text style={styles.tagline}>Votre patrimoine immobilier, en toute clarté.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Connexion</Text>
          {globalError ? <Banner tone="error">{globalError}</Banner> : null}

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
            autoComplete="current-password"
            textContentType="password"
            placeholder="••••••••••••"
            error={errors.password}
          />

          <Button label="Se connecter" onPress={handleSubmit} loading={submitting} />

          <Link href="/inscription" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkText}>
                Pas encore de compte ? <Text style={styles.linkStrong}>Créer un compte</Text>
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
  brand: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  appName: { fontSize: 22, fontWeight: '700', color: colors.text },
  tagline: { marginTop: spacing.xs, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  linkButton: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { fontSize: 14, color: colors.textMuted },
  linkStrong: { color: colors.brand, fontWeight: '600' },
});
