import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Building, OwnerEntity } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { BuildingForm } from '@/components/buildings/building-form';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Modifier un immeuble' };

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let building: Building;
  try {
    building = await serverFetch<Building>(`/buildings/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const entities = await serverFetch<OwnerEntity[]>('/owner-entities');

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/immeubles" className="hover:text-brand-700">
          Immeubles
        </Link>{' '}
        /{' '}
        <Link href={`/immeubles/${id}`} className="hover:text-brand-700">
          {building.name}
        </Link>{' '}
        / <span className="text-slate-700">Modifier</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Modifier « {building.name} »
        </h1>
      </header>
      <div className="card p-5 sm:p-6">
        <BuildingForm entities={entities} building={building} />
      </div>
    </div>
  );
}
