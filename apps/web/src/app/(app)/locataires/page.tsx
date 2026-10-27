import type { Metadata } from 'next';
import Link from 'next/link';
import type { Tenant } from '@immo/shared';
import { ArchivedBadge, TenantTypeBadge } from '@/components/badges';
import { ArchiveButton } from '@/components/archive-button';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Locataires' };

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string; q?: string }>;
}) {
  const { archives, q } = await searchParams;

  const query = new URLSearchParams();
  if (archives === '1') query.set('archived', 'true');
  if (q) query.set('search', q);

  const tenants = await serverFetch<Tenant[]>(
    `/tenants${query.size > 0 ? `?${query.toString()}` : ''}`,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Locataires</h1>
          <p className="mt-1 text-sm text-slate-500">
            Personnes physiques ou morales qui louent vos biens, avec leurs coordonnées.
          </p>
        </div>
        <Link href="/locataires/nouveau" className="btn-primary">
          Ajouter un locataire
        </Link>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-52 flex-1">
          <label className="field-label" htmlFor="q">
            Rechercher
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Nom, email, ville…"
            className="field-input"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="archives"
            value="1"
            defaultChecked={archives === '1'}
            className="h-4 w-4 rounded border-slate-300 text-brand-700"
          />
          Archives
        </label>
        <button type="submit" className="btn-secondary">
          Filtrer
        </button>
      </form>

      {tenants.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Aucun locataire ne correspond à ces critères.</p>
          <Link href="/locataires/nouveau" className="btn-primary mt-4">
            Ajouter mon premier locataire
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tenants.map((tenant) => (
            <li key={tenant.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/locataires/${tenant.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700"
                  >
                    {tenant.name}
                  </Link>
                  <TenantTypeBadge type={tenant.type} />
                  {tenant.archivedAt ? <ArchivedBadge /> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {tenant.email ?? 'Email non renseigné'}
                  {tenant.phone ? ` · ${tenant.phone}` : ''}
                  {tenant.city ? ` · ${tenant.city}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {typeof tenant.leaseCount === 'number' ? (
                  <span className="badge bg-slate-100 text-slate-700">
                    {tenant.leaseCount === 0
                      ? 'Aucun bail'
                      : `${tenant.leaseCount} bail${tenant.leaseCount > 1 ? 'x' : ''}`}
                  </span>
                ) : null}
                <Link href={`/locataires/${tenant.id}`} className="btn-secondary">
                  Ouvrir
                </Link>
                <ArchiveButton
                  resource="tenants"
                  id={tenant.id}
                  archived={Boolean(tenant.archivedAt)}
                  label={tenant.name}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
