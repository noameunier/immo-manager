'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api';

type Props = {
  resource: 'owner-entities' | 'buildings' | 'properties';
  id: string;
  archived: boolean;
  label: string;
};

/** Archive (suppression logique) ou restaure une ressource, puis rafraîchit la page. */
export function ArchiveButton({ resource, id, archived, label }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!archived && !window.confirm(`Archiver « ${label} » ? Elle restera consultable.`)) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      await apiFetch(
        archived ? `/${resource}/${id}/restore` : `/${resource}/${id}`,
        { method: archived ? 'POST' : 'DELETE' },
      );
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
        {pending ? '…' : archived ? 'Restaurer' : 'Archiver'}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
