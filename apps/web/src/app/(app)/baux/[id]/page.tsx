import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Lease } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { ArchiveButton } from '@/components/archive-button';
import { LeaseStatusBadge, LeaseTypeBadge } from '@/components/badges';
import { formatCurrency, formatDate } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Fiche bail' };

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let lease: Lease;
  try {
    lease = await serverFetch<Lease>(`/leases/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-8">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/baux" className="hover:text-brand-700">
          Baux
        </Link>{' '}
        / <span className="text-slate-700">{lease.property?.name ?? 'Bail'}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <LeaseTypeBadge type={lease.type} />
            <LeaseStatusBadge status={lease.status} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {lease.property?.name ?? 'Bail'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {lease.tenant ? (
              <Link href={`/locataires/${lease.tenant.id}`} className="hover:text-brand-700">
                {lease.tenant.name}
              </Link>
            ) : (
              'Locataire inconnu'
            )}
            {lease.entity ? (
              <>
                {' · '}
                <Link href={`/entites/${lease.entity.id}`} className="hover:text-brand-700">
                  {lease.entity.name}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/baux/${lease.id}/modifier`} className="btn-secondary">
            Modifier
          </Link>
          <ArchiveButton
            resource="leases"
            id={lease.id}
            archived={Boolean(lease.archivedAt)}
            label="ce bail"
            actionLabel="Terminer le bail"
            restoreLabel="Restaurer"
            confirmMessage="Terminer ce bail ? Il restera consultable dans l’historique."
          />
        </div>
      </header>

      <section className="card p-5" aria-labelledby="conditions">
        <h2 id="conditions" className="text-sm font-semibold text-slate-900">
          Conditions financières
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">Loyer hors charges</dt>
            <dd className="text-slate-900">{formatCurrency(lease.rentAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Charges</dt>
            <dd className="text-slate-900">{formatCurrency(lease.chargesAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Total mensuel</dt>
            <dd className="font-semibold text-slate-900">{formatCurrency(lease.monthlyTotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Dépôt de garantie</dt>
            <dd className="text-slate-900">{formatCurrency(lease.depositAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Jour d’échéance</dt>
            <dd className="text-slate-900">Le {lease.paymentDay} du mois</dd>
          </div>
        </dl>
      </section>

      <section className="card p-5" aria-labelledby="periodes">
        <h2 id="periodes" className="text-sm font-semibold text-slate-900">
          Période
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Début</dt>
            <dd className="text-slate-900">{formatDate(lease.startsOn)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Fin</dt>
            <dd className="text-slate-900">
              {lease.endsOn ? formatDate(lease.endsOn) : 'Sans terme'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Bien</dt>
            <dd className="text-slate-900">
              <Link href={`/biens/${lease.propertyId}`} className="text-brand-700 hover:underline">
                Ouvrir la fiche du bien
              </Link>
            </dd>
          </div>
        </dl>
        {lease.notes ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{lease.notes}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
