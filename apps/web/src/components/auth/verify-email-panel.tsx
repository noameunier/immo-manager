'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';
import { FormAlert, FormSuccess } from '@/components/form-fields';

type State =
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export function VerifyEmailPanel({ token }: { token: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    apiFetch('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => {
        if (!cancelled) setState({ status: 'success' });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <h1 className="text-xl font-semibold text-slate-900">Vérification en cours…</h1>
        <p className="text-sm text-slate-500">Merci de patienter quelques instants.</p>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Adresse email confirmée</h1>
        <FormSuccess>Votre adresse email est désormais vérifiée.</FormSuccess>
        <Link href="/tableau-de-bord" className="btn-primary w-full">
          Accéder à mon patrimoine
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Vérification impossible</h1>
      <FormAlert>{state.message}</FormAlert>
      <Link href="/tableau-de-bord" className="btn-secondary w-full">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
