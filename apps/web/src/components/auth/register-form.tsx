'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { registerSchema } from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import { FormAlert, TextField } from '@/components/form-fields';

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGlobalError(null);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      fullName: String(formData.get('fullName') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      confirmPassword: String(formData.get('confirmPassword') ?? ''),
    };

    if (values.password !== values.confirmPassword) {
      setErrors({ confirmPassword: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    const parsed = registerSchema.safeParse(values);
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
      await apiFetch('/auth/register', { method: 'POST', body: parsed.data });
      router.replace('/tableau-de-bord?bienvenue=1');
      router.refresh();
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
        <h1 className="text-xl font-semibold text-slate-900">Créer un compte</h1>
        <p className="mt-1 text-sm text-slate-500">
          Commencez à gérer vos biens en quelques minutes.
        </p>
      </div>

      {globalError ? <FormAlert>{globalError}</FormAlert> : null}

      <TextField
        label="Nom complet"
        name="fullName"
        autoComplete="name"
        required
        error={errors.fullName}
      />
      <TextField
        label="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Minimum 12 caractères."
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
        {submitting ? 'Création…' : 'Créer mon compte'}
      </button>

      <p className="text-sm text-slate-500">
        Déjà inscrit ?{' '}
        <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
