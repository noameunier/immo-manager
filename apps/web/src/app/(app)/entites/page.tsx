import type { Metadata } from 'next';
import Link from 'next/link';
import type { OwnerEntity } from '@immo/shared';
import { ArchivedBadge, EntityTypeBadge } from '@/components/badges';
import { ArchiveButton } from '@/components/archive-button';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Entités propriétaires' };

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string; q?: string }>;
}) {
  const { archives, q } = await searchParams;
  const includeArchived = archives === '1';

  const query = new URLSearchParams();
  if (includeArchived) query.set('includeArchived', 'true');
  if (q) query.set('search', q);

  const entities = await serverFetch<OwnerEntity[]>(
    `/owner-entities${query.size > 0 ? `?${query.toString()}` : ''}`,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Entités propriétaires
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Personne physique, SCI, société ou indivision : l’entité porte vos biens.
          </p>
        </div>
        <Link href="/entites/nouvelle" className="btn-primary">
          Ajouter une entité
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
            placeholder="Nom, raison sociale, ville…"
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

      {entities.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">
            Aucune entité ne correspond à votre recherche.
          </p>
          <Link href="/entites/nouvelle" className="btn-primary mt-4">
            Créer ma première entité
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {entities.map((entity) => (
            <li key={entity.id} className="card flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <EntityTypeBadge type={entity.type} />
                {entity.archivedAt ? <ArchivedBadge /> : null}
              </div>
              <h2 className="mt-2 text-base font-semibold text-slate-900">
                <Link href={`/entites/${entity.id}`} className="hover:text-brand-700">
                  {entity.name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {[entity.city, entity.postalCode].filter(Boolean).join(' · ') || 'Adresse non renseignée'}
              </p>
              {entity.siren ? (
                <p className="mt-1 text-xs text-slate-500">SIREN {entity.siren}</p>
              ) : null}
              <dl className="mt-4 flex gap-6 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Immeubles</dt>
                  <dd className="font-semibold text-slate-900">{entity.counts?.buildings ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Biens</dt>
                  <dd className="font-semibold text-slate-900">{entity.counts?.properties ?? 0}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link href={`/entites/${entity.id}`} className="btn-secondary">
                  Ouvrir
                </Link>
                <ArchiveButton
                  resource="owner-entities"
                  id={entity.id}
                  archived={Boolean(entity.archivedAt)}
                  label={entity.name}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
