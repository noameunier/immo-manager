import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Building, OwnerEntity, Property } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { ArchiveButton } from '@/components/archive-button';
import {
  ArchivedBadge,
  EntityTypeBadge,
  OccupancyBadge,
  PropertyTypeBadge,
} from '@/components/badges';
import { formatDate, formatSurface } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Fiche entité' };

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let entity: OwnerEntity;
  try {
    entity = await serverFetch<OwnerEntity>(`/owner-entities/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [buildings, properties] = await Promise.all([
    serverFetch<Building[]>(`/buildings?entityId=${id}`),
    serverFetch<Property[]>(`/properties?entityId=${id}`),
  ]);

  return (
    <div className="space-y-8">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/entites" className="hover:text-brand-700">
          Entités
        </Link>{' '}
        / <span className="text-slate-700">{entity.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <EntityTypeBadge type={entity.type} />
            {entity.archivedAt ? <ArchivedBadge /> : null}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {entity.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {[entity.addressLine1, entity.postalCode, entity.city].filter(Boolean).join(', ') ||
              'Adresse non renseignée'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/entites/${entity.id}/modifier`} className="btn-secondary">
            Modifier
          </Link>
          <ArchiveButton
            resource="owner-entities"
            id={entity.id}
            archived={Boolean(entity.archivedAt)}
            label={entity.name}
          />
        </div>
      </header>

      <section className="card p-5" aria-labelledby="informations">
        <h2 id="informations" className="text-sm font-semibold text-slate-900">
          Informations
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Raison sociale</dt>
            <dd className="text-slate-900">{entity.legalName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">SIREN</dt>
            <dd className="text-slate-900">{entity.siren ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">SIRET</dt>
            <dd className="text-slate-900">{entity.siret ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">TVA</dt>
            <dd className="text-slate-900">{entity.vatNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Email</dt>
            <dd className="text-slate-900">{entity.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Téléphone</dt>
            <dd className="text-slate-900">{entity.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Créée le</dt>
            <dd className="text-slate-900">{formatDate(entity.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Dernière modification</dt>
            <dd className="text-slate-900">{formatDate(entity.updatedAt)}</dd>
          </div>
        </dl>
        {entity.notes ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{entity.notes}</p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="immeubles">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="immeubles" className="text-lg font-semibold text-slate-900">
            Immeubles ({buildings.length})
          </h2>
          <Link href={`/immeubles/nouveau?entite=${entity.id}`} className="btn-primary">
            Ajouter un immeuble
          </Link>
        </div>

        {buildings.length === 0 ? (
          <p className="card mt-3 p-5 text-sm text-slate-500">
            Aucun immeuble rattaché à cette entité.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {buildings.map((building) => (
              <li key={building.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/immeubles/${building.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700"
                  >
                    {building.name}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {building.counts?.properties ?? 0} bien(s)
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {building.addressLine1}, {building.postalCode} {building.city}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="biens">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="biens" className="text-lg font-semibold text-slate-900">
            Biens ({properties.length})
          </h2>
          <Link href={`/biens/nouveau?entite=${entity.id}`} className="btn-primary">
            Ajouter un bien
          </Link>
        </div>

        {properties.length === 0 ? (
          <p className="card mt-3 p-5 text-sm text-slate-500">
            Aucun bien rattaché à cette entité.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {properties.map((property) => (
              <li key={property.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/biens/${property.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {property.name}
                    </Link>
                    <PropertyTypeBadge type={property.type} />
                    <OccupancyBadge status={property.occupancyStatus} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {property.building ? property.building.name : 'Bien indépendant'} ·{' '}
                    {formatSurface(property.surfaceM2)}
                  </p>
                </div>
                {property.lotNumber ? (
                  <span className="text-xs text-slate-500">Lot {property.lotNumber}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
