import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type TextInputProps,
} from 'react-native';
import { colors, spacing } from '@/lib/theme';

export function Screen({
  children,
  scroll = true,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  if (!scroll) {
    return <View style={styles.screen}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.pageTitle}>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || isDisabled) && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : colors.brand} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant !== 'primary' && styles.buttonLabelSecondary,
            variant === 'danger' && styles.buttonLabelDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ label, error, hint, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        {...props}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.banner,
        tone === 'error' && styles.bannerError,
        tone === 'success' && styles.bannerSuccess,
        tone === 'info' && styles.bannerInfo,
      ]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
    >
      <Text
        style={[
          styles.bannerText,
          tone === 'error' && styles.bannerTextError,
          tone === 'success' && styles.bannerTextSuccess,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.hint}>Chargement…</Text>
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'brand' | 'success';
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'brand' && styles.badgeBrand,
        tone === 'success' && styles.badgeSuccess,
      ]}
    >
      <Text
        style={[
          styles.badgeLabel,
          tone === 'brand' && styles.badgeLabelBrand,
          tone === 'success' && styles.badgeLabelSuccess,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.subtitle}>{description}</Text>
    </Card>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pageTitle: { marginBottom: spacing.md },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  button: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  buttonPrimary: { backgroundColor: colors.brand },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonDanger: {
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  buttonPressed: { opacity: 0.7 },
  buttonLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  buttonLabelSecondary: { color: colors.text },
  buttonLabelDanger: { color: colors.danger },
  field: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: '#fca5a5' },
  error: { marginTop: spacing.xs, fontSize: 12, color: colors.danger },
  hint: { marginTop: spacing.xs, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  banner: {
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bannerError: { backgroundColor: colors.dangerBackground, borderColor: '#fecaca' },
  bannerSuccess: { backgroundColor: colors.successBackground, borderColor: '#a7f3d0' },
  bannerInfo: { backgroundColor: colors.warningBackground, borderColor: '#fde68a' },
  bannerText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bannerTextError: { color: colors.danger },
  bannerTextSuccess: { color: colors.success },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: '#f1f5f9',
  },
  badgeBrand: { backgroundColor: colors.brandLight },
  badgeSuccess: { backgroundColor: colors.successBackground },
  badgeLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  badgeLabelBrand: { color: colors.brandDark },
  badgeLabelSuccess: { color: colors.success },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
});
