import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Lease, Tenant } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { ArchiveButton } from '@/components/archive-button';
import {
  ArchivedBadge,
  LeaseStatusBadge,
  LeaseTypeBadge,
  TenantTypeBadge,
} from '@/components/badges';
import { formatCurrency, formatDate } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Fiche locataire' };

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let tenant: Tenant;
  try {
    tenant = await serverFetch<Tenant>(`/tenants/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const leases = await serverFetch<Lease[]>(`/leases?tenantId=${id}&archived=true`);

  const address = [
    tenant.addressLine1,
    tenant.addressLine2,
    [tenant.postalCode, tenant.city].filter(Boolean).join(' '),
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/locataires" className="hover:text-brand-700">
          Locataires
        </Link>{' '}
        / <span className="text-slate-700">{tenant.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <TenantTypeBadge type={tenant.type} />
            {tenant.archivedAt ? <ArchivedBadge /> : null}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {tenant.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {tenant.email ?? 'Email non renseigné'}
            {tenant.phone ? ` · ${tenant.phone}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/locataires/${tenant.id}/modifier`} className="btn-secondary">
            Modifier
          </Link>
          <ArchiveButton
            resource="tenants"
            id={tenant.id}
            archived={Boolean(tenant.archivedAt)}
            label={tenant.name}
          />
        </div>
      </header>

      <section className="card p-5" aria-labelledby="coordonnees">
        <h2 id="coordonnees" className="text-sm font-semibold text-slate-900">
          Coordonnées
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Email</dt>
            <dd className="text-slate-900">{tenant.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Téléphone</dt>
            <dd className="text-slate-900">{tenant.phone ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Adresse</dt>
            <dd className="text-slate-900">
              {address.length > 0 ? (
                <address className="not-italic">
                  {address.map((line, index) => (
                    <span key={line + String(index)}>
                      {index > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Créé le</dt>
            <dd className="text-slate-900">{formatDate(tenant.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Dernière modification</dt>
            <dd className="text-slate-900">{formatDate(tenant.updatedAt)}</dd>
          </div>
        </dl>
        {tenant.notes ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{tenant.notes}</p>
          </div>
        ) : null}
      </section>

      <section className="card p-5" aria-labelledby="baux">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="baux" className="text-sm font-semibold text-slate-900">
            Baux ({leases.length})
          </h2>
          <Link href={`/baux/nouveau?locataire=${tenant.id}`} className="btn-secondary">
            Créer un bail
          </Link>
        </div>

        {leases.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Aucun bail pour ce locataire. Créez-en un depuis un bien ou avec le bouton ci-dessus.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {leases.map((lease) => (
              <li key={lease.id} className="flex flex-wrap items-center gap-3 py-3">
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
                    Du {formatDate(lease.startsOn)} au{' '}
                    {lease.endsOn ? formatDate(lease.endsOn) : 'terme'} ·{' '}
                    {formatCurrency(lease.monthlyTotal)} / mois
                  </p>
                </div>
                <Link href={`/baux/${lease.id}`} className="btn-secondary">
                  Ouvrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
