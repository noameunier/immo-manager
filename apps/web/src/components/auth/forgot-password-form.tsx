'use client';

import Link from 'next/link';
import { useState } from 'react';
import { forgotPasswordSchema } from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import { FormAlert, FormSuccess, TextField } from '@/components/form-fields';

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGlobalError(null);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: String(formData.get('email') ?? '') });

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
      await apiFetch('/auth/forgot-password', { method: 'POST', body: parsed.data });
      setSent(true);
    } catch (error) {
      setErrors(fieldErrors(error));
      setGlobalError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-slate-900">Vérifiez vos emails</h1>
        <FormSuccess>
          Si un compte existe avec cette adresse, un lien de réinitialisation vient d’être envoyé.
          Il expire au bout d’une heure.
        </FormSuccess>
        <p className="text-sm text-slate-500">
          En développement, les emails sont consultables dans Mailpit (port 8026).
        </p>
        <Link href="/connexion" className="btn-secondary w-full">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-slate-500">
          Indiquez votre adresse email : nous vous enverrons un lien sécurisé.
        </p>
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

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Envoi…' : 'Envoyer le lien'}
      </button>

      <Link href="/connexion" className="block text-sm text-brand-700 hover:underline">
        Retour à la connexion
      </Link>
    </form>
  );
}
