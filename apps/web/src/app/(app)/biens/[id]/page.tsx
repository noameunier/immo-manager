import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Property } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { ArchiveButton } from '@/components/archive-button';
import { ArchivedBadge, OccupancyBadge, PropertyTypeBadge } from '@/components/badges';
import { formatDate, formatSurface } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Fiche bien' };

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let property: Property;
  try {
    property = await serverFetch<Property>(`/properties/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-8">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/biens" className="hover:text-brand-700">
          Biens
        </Link>{' '}
        / <span className="text-slate-700">{property.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PropertyTypeBadge type={property.type} />
            <OccupancyBadge status={property.occupancyStatus} />
            {property.archivedAt ? <ArchivedBadge /> : null}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {property.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {property.entity ? (
              <Link href={`/entites/${property.entity.id}`} className="hover:text-brand-700">
                {property.entity.name}
              </Link>
            ) : (
              'Entité inconnue'
            )}
            {property.building ? (
              <>
                {' · '}
                <Link href={`/immeubles/${property.building.id}`} className="hover:text-brand-700">
                  {property.building.name}
                </Link>
              </>
            ) : (
              ' · Bien indépendant'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/biens/${property.id}/modifier`} className="btn-secondary">
            Modifier
          </Link>
          <ArchiveButton
            resource="properties"
            id={property.id}
            archived={Boolean(property.archivedAt)}
            label={property.name}
          />
        </div>
      </header>

      <section className="card p-5" aria-labelledby="caracteristiques">
        <h2 id="caracteristiques" className="text-sm font-semibold text-slate-900">
          Caractéristiques
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Numéro de lot</dt>
            <dd className="text-slate-900">{property.lotNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Étage</dt>
            <dd className="text-slate-900">{property.floor ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Référence</dt>
            <dd className="text-slate-900">{property.reference ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Surface</dt>
            <dd className="text-slate-900">{formatSurface(property.surfaceM2)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Pièces</dt>
            <dd className="text-slate-900">{property.rooms ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Dernière modification</dt>
            <dd className="text-slate-900">{formatDate(property.updatedAt)}</dd>
          </div>
        </dl>
        {property.description ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">Description</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
              {property.description}
            </p>
          </div>
        ) : null}
      </section>

      <section className="card p-5" aria-labelledby="adresse">
        <h2 id="adresse" className="text-sm font-semibold text-slate-900">
          Adresse
        </h2>
        {property.building && !property.addressLine1 ? (
          <p className="mt-3 text-sm text-slate-600">
            Le bien est situé à l’adresse de l’immeuble{' '}
            <Link
              href={`/immeubles/${property.building.id}`}
              className="text-brand-700 hover:underline"
            >
              {property.building.name}
            </Link>{' '}
            ({property.building.city}).
          </p>
        ) : (
          <address className="mt-3 text-sm not-italic text-slate-700">
            {property.addressLine1 ?? '—'}
            {property.addressLine2 ? (
              <>
                <br />
                {property.addressLine2}
              </>
            ) : null}
            <br />
            {property.postalCode ?? ''} {property.city ?? ''}
            {property.country !== 'FR' ? ` · ${property.country}` : ''}
          </address>
        )}
      </section>
    </div>
  );
}
