import type { Metadata } from 'next';
import Link from 'next/link';
import type { OwnerEntity } from '@immo/shared';
import { BuildingForm } from '@/components/buildings/building-form';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Nouvel immeuble' };

export default async function NewBuildingPage({
  searchParams,
}: {
  searchParams: Promise<{ entite?: string }>;
}) {
  const { entite } = await searchParams;
  const entities = await serverFetch<OwnerEntity[]>('/owner-entities');

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/immeubles" className="hover:text-brand-700">
          Immeubles
        </Link>{' '}
        / <span className="text-slate-700">Nouveau</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ajouter un immeuble</h1>
        <p className="mt-1 text-sm text-slate-500">
          L’immeuble doit être rattaché à l’une de vos entités propriétaires.
        </p>
      </header>
      <div className="card p-5 sm:p-6">
        <BuildingForm entities={entities} defaultEntityId={entite} />
      </div>
    </div>
  );
}
