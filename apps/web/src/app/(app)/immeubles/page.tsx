import type { Metadata } from 'next';
import Link from 'next/link';
import type { Building } from '@immo/shared';
import { ArchivedBadge } from '@/components/badges';
import { ArchiveButton } from '@/components/archive-button';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Immeubles' };

export default async function BuildingsPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string; q?: string }>;
}) {
  const { archives, q } = await searchParams;
  const includeArchived = archives === '1';

  const query = new URLSearchParams();
  if (includeArchived) query.set('includeArchived', 'true');
  if (q) query.set('search', q);

  const buildings = await serverFetch<Building[]>(
    `/buildings${query.size > 0 ? `?${query.toString()}` : ''}`,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Immeubles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Les immeubles regroupent plusieurs lots (appartements, parkings, boxes).
          </p>
        </div>
        <Link href="/immeubles/nouveau" className="btn-primary">
          Ajouter un immeuble
        </Link>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label className="field-label" htmlFor="q">
            Rechercher
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Nom, ville, code postal…"
            className="field-input"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="archives"
            value="1"
            defaultChecked={includeArchived}
            className="h-4 w-4 rounded border-slate-300 text-brand-700"
          />
          Afficher les archives
        </label>
        <button type="submit" className="btn-secondary">
          Filtrer
        </button>
      </form>

      {buildings.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Aucun immeuble pour le moment.</p>
          <Link href="/immeubles/nouveau" className="btn-primary mt-4">
            Créer mon premier immeuble
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {buildings.map((building) => (
            <li key={building.id} className="card flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-slate-100 text-slate-700">
                  {building.entity?.name ?? 'Entité inconnue'}
                </span>
                {building.archivedAt ? <ArchivedBadge /> : null}
              </div>
              <h2 className="mt-2 text-base font-semibold text-slate-900">
                <Link href={`/immeubles/${building.id}`} className="hover:text-brand-700">
                  {building.name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {building.addressLine1}
                <br />
                {building.postalCode} {building.city}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                {building.counts?.properties ?? 0} bien(s) rattaché(s)
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link href={`/immeubles/${building.id}`} className="btn-secondary">
                  Ouvrir
                </Link>
                <ArchiveButton
                  resource="buildings"
                  id={building.id}
                  archived={Boolean(building.archivedAt)}
                  label={building.name}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
