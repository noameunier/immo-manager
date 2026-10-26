import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Building, Property } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { ArchiveButton } from '@/components/archive-button';
import { ArchivedBadge, OccupancyBadge, PropertyTypeBadge } from '@/components/badges';
import { formatDate, formatSurface } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Fiche immeuble' };

type BuildingDetail = Building & { properties: Property[] };

export default async function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let building: BuildingDetail;
  try {
    building = await serverFetch<BuildingDetail>(`/buildings/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-8">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/immeubles" className="hover:text-brand-700">
          Immeubles
        </Link>{' '}
        / <span className="text-slate-700">{building.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-slate-100 text-slate-700">
              {building.entity?.name ?? 'Entité inconnue'}
            </span>
            {building.archivedAt ? <ArchivedBadge /> : null}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {building.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {building.addressLine1}
            {building.addressLine2 ? `, ${building.addressLine2}` : ''}
            <br />
            {building.postalCode} {building.city}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/immeubles/${building.id}/modifier`} className="btn-secondary">
            Modifier
          </Link>
          <ArchiveButton
            resource="buildings"
            id={building.id}
            archived={Boolean(building.archivedAt)}
            label={building.name}
          />
        </div>
      </header>

      <section className="card p-5" aria-labelledby="informations">
        <h2 id="informations" className="text-sm font-semibold text-slate-900">
          Informations
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Référence</dt>
            <dd className="text-slate-900">{building.reference ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Année de construction</dt>
            <dd className="text-slate-900">{building.constructionYear ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Créé le</dt>
            <dd className="text-slate-900">{formatDate(building.createdAt)}</dd>
          </div>
        </dl>
        {building.notes ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{building.notes}</p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="lots">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="lots" className="text-lg font-semibold text-slate-900">
            Lots ({building.properties.length})
          </h2>
          <Link
            href={`/biens/nouveau?immeuble=${building.id}&entite=${building.entityId}`}
            className="btn-primary"
          >
            Ajouter un lot
          </Link>
        </div>

        {building.properties.length === 0 ? (
          <p className="card mt-3 p-5 text-sm text-slate-500">
            Aucun lot dans cet immeuble. Ajoutez un appartement, un parking ou un box.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {building.properties.map((property) => (
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
                    {property.lotNumber ? `Lot ${property.lotNumber} · ` : ''}
                    {formatSurface(property.surfaceM2)}
                    {property.floor ? ` · Étage ${property.floor}` : ''}
                  </p>
                </div>
                <Link href={`/biens/${property.id}`} className="btn-secondary">
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
