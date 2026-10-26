import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Building, OwnerEntity, Property } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { PropertyForm } from '@/components/properties/property-form';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Modifier un bien' };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let property: Property;
  try {
    property = await serverFetch<Property>(`/properties/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [entities, buildings] = await Promise.all([
    serverFetch<OwnerEntity[]>('/owner-entities'),
    serverFetch<Building[]>('/buildings'),
  ]);

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/biens" className="hover:text-brand-700">
          Biens
        </Link>{' '}
        /{' '}
        <Link href={`/biens/${id}`} className="hover:text-brand-700">
          {property.name}
        </Link>{' '}
        / <span className="text-slate-700">Modifier</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Modifier « {property.name} »
        </h1>
      </header>
      <div className="card p-5 sm:p-6">
        <PropertyForm entities={entities} buildings={buildings} property={property} />
      </div>
    </div>
  );
}
