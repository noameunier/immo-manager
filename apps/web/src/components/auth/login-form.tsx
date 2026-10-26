'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { loginSchema } from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import { FormAlert, TextField } from '@/components/form-fields';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGlobalError(null);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    const parsed = loginSchema.safeParse(values);
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
      await apiFetch('/auth/login', { method: 'POST', body: parsed.data });
      const next = searchParams.get('suivant');
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/tableau-de-bord';
      router.replace(target);
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
        <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-500">Accédez à votre patrimoine immobilier.</p>
      </div>

      {globalError ? <FormAlert>{globalError}</FormAlert> : null}

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
        autoComplete="current-password"
        required
        error={errors.password}
      />

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Connexion…' : 'Se connecter'}
      </button>

      <div className="flex flex-col gap-2 text-sm">
        <Link href="/mot-de-passe-oublie" className="text-brand-700 hover:underline">
          Mot de passe oublié ?
        </Link>
        <p className="text-slate-500">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="font-semibold text-brand-700 hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </form>
  );
}
