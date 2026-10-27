'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';

type Props = {
  resource: 'owner-entities' | 'buildings' | 'properties' | 'tenants' | 'leases';
  id: string;
  archived: boolean;
  label: string;
  /** Verbe de l'action principale (par défaut « Archiver »). */
  actionLabel?: string;
  restoreLabel?: string;
  confirmMessage?: string;
};

/** Archive (suppression logique) ou restaure une ressource, puis rafraîchit la page. */
export function ArchiveButton({
  resource,
  id,
  archived,
  label,
  actionLabel = 'Archiver',
  restoreLabel = 'Restaurer',
  confirmMessage,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!archived) {
      const message = confirmMessage ?? `Archiver « ${label} » ? L’élément restera consultable.`;
      if (!window.confirm(message)) return;
    }

    setPending(true);
    setError(null);
    try {
      await apiFetch(archived ? `/${resource}/${id}/restore` : `/${resource}/${id}`, {
        method: archived ? 'POST' : 'DELETE',
      });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={archived ? 'btn-secondary' : 'btn-danger'}
      >
        {pending ? '…' : archived ? restoreLabel : actionLabel}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
