import type { Metadata } from 'next';
import Link from 'next/link';
import type { Lease } from '@immo/shared';
import { LEASE_STATUSES, LEASE_STATUS_LABELS } from '@immo/shared';
import { LeaseStatusBadge, LeaseTypeBadge } from '@/components/badges';
import { ArchiveButton } from '@/components/archive-button';
import { formatCurrency, formatDate } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Baux' };

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; archives?: string }>;
}) {
  const { statut, archives } = await searchParams;

  const query = new URLSearchParams();
  if (statut && (LEASE_STATUSES as string[]).includes(statut)) query.set('status', statut);
  if (archives === '1') query.set('archived', 'true');

  const leases = await serverFetch<Lease[]>(
    `/leases${query.size > 0 ? `?${query.toString()}` : ''}`,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Baux</h1>
          <p className="mt-1 text-sm text-slate-500">
            Baux en cours, à venir et historique, avec leurs conditions financières.
          </p>
        </div>
        <Link href="/baux/nouveau" className="btn-primary">
          Créer un bail
        </Link>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <div>
          <label className="field-label" htmlFor="statut">
            Statut
          </label>
          <select id="statut" name="statut" defaultValue={statut ?? ''} className="field-input">
            <option value="">Tous les statuts</option>
            {LEASE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LEASE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="archives"
            value="1"
            defaultChecked={archives === '1'}
            className="h-4 w-4 rounded border-slate-300 text-brand-700"
          />
          Inclure les baux terminés
        </label>
        <button type="submit" className="btn-secondary">
          Filtrer
        </button>
      </form>

      {leases.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Aucun bail ne correspond à ces critères.</p>
          <Link href="/baux/nouveau" className="btn-primary mt-4">
            Créer mon premier bail
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {leases.map((lease) => (
            <li key={lease.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/baux/${lease.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700"
                  >
                    {lease.property?.name ?? 'Bien'}
                  </Link>
                  <LeaseTypeBadge type={lease.type} />
                  <LeaseStatusBadge status={lease.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {lease.tenant?.name ?? 'Locataire'} · {lease.entity?.name ?? 'Entité inconnue'} ·
                  du {formatDate(lease.startsOn)} au{' '}
                  {lease.endsOn ? formatDate(lease.endsOn) : 'terme'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCurrency(lease.rentAmount)} + {formatCurrency(lease.chargesAmount)} de
                  charges ={' '}
                  <span className="font-medium">{formatCurrency(lease.monthlyTotal)}</span> / mois ·
                  échéance le {lease.paymentDay}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/baux/${lease.id}`} className="btn-secondary">
                  Ouvrir
                </Link>
                <ArchiveButton
                  resource="leases"
                  id={lease.id}
                  archived={Boolean(lease.archivedAt)}
                  label={`le bail de ${lease.tenant?.name ?? 'ce locataire'}`}
                  actionLabel="Terminer"
                  restoreLabel="Restaurer"
                  confirmMessage={`Terminer le bail de « ${
                    lease.tenant?.name ?? 'ce locataire'
                  } » ? Il restera consultable dans l’historique.`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
