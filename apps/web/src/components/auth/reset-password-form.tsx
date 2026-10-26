'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { resetPasswordSchema } from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import { FormAlert, TextField } from '@/components/form-fields';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGlobalError(null);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ token, password });
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
      await apiFetch('/auth/reset-password', { method: 'POST', body: parsed.data });
      router.replace('/connexion?reinitialise=1');
    } catch (error) {
      setErrors(fieldErrors(error));
      setGlobalError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez un mot de passe d’au moins 12 caractères, unique pour ce service.
        </p>
      </div>

      {globalError ? <FormAlert>{globalError}</FormAlert> : null}

      <TextField
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.password}
      />
      <TextField
        label="Confirmer le mot de passe"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
      </button>

      <Link href="/connexion" className="block text-sm text-brand-700 hover:underline">
        Retour à la connexion
      </Link>
    </form>
  );
}
