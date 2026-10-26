import type { Metadata } from 'next';
import Link from 'next/link';
import type { Property } from '@immo/shared';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '@immo/shared';
import { ArchivedBadge, OccupancyBadge, PropertyTypeBadge } from '@/components/badges';
import { ArchiveButton } from '@/components/archive-button';
import { formatSurface } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Biens' };

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string; q?: string; type?: string }>;
}) {
  const { archives, q, type } = await searchParams;

  const query = new URLSearchParams();
  if (archives === '1') query.set('archived', 'true');
  if (q) query.set('search', q);
  if (type && (PROPERTY_TYPES as string[]).includes(type)) query.set('type', type);

  const properties = await serverFetch<Property[]>(
    `/properties${query.size > 0 ? `?${query.toString()}` : ''}`,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Biens</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lots rattachés à un immeuble et biens indépendants (maison, garage, parking, box).
          </p>
        </div>
        <Link href="/biens/nouveau" className="btn-primary">
          Ajouter un bien
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
            placeholder="Nom, référence, lot, ville…"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" defaultValue={type ?? ''} className="field-input">
            <option value="">Tous les types</option>
            {PROPERTY_TYPES.map((value) => (
              <option key={value} value={value}>
                {PROPERTY_TYPE_LABELS[value]}
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
          Archives
        </label>
        <button type="submit" className="btn-secondary">
          Filtrer
        </button>
      </form>

      {properties.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Aucun bien ne correspond à ces critères.</p>
          <Link href="/biens/nouveau" className="btn-primary mt-4">
            Ajouter mon premier bien
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {properties.map((property) => (
            <li key={property.id} className="card flex flex-wrap items-center gap-4 p-4">
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
                  {property.archivedAt ? <ArchivedBadge /> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {property.entity?.name ?? 'Entité inconnue'} ·{' '}
                  {property.building ? property.building.name : 'Bien indépendant'} ·{' '}
                  {formatSurface(property.surfaceM2)}
                  {property.rooms ? ` · ${property.rooms} pièce(s)` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/biens/${property.id}`} className="btn-secondary">
                  Ouvrir
                </Link>
                <ArchiveButton
                  resource="properties"
                  id={property.id}
                  archived={Boolean(property.archivedAt)}
                  label={property.name}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
