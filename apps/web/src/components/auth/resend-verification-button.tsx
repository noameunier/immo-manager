'use client';

import { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';

export function ResendVerificationButton() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setState('sending');
    setError(null);
    try {
      await apiFetch('/auth/verification/resend', { method: 'POST' });
      setState('sent');
    } catch (caught) {
      setError(errorMessage(caught));
      setState('error');
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'sending' || state === 'sent'}
        className="btn-primary"
      >
        {state === 'sending'
          ? 'Envoi…'
          : state === 'sent'
            ? 'Email envoyé'
            : 'Renvoyer l’email de vérification'}
      </button>
      {state === 'sent' ? (
        <p className="text-sm text-emerald-700">
          Un nouvel email vient d’être envoyé. Consultez votre boîte de réception.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
