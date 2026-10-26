import type { Metadata } from 'next';
import Link from 'next/link';
import type { Building, OwnerEntity } from '@immo/shared';
import { PropertyForm } from '@/components/properties/property-form';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Nouveau bien' };

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ entite?: string; immeuble?: string }>;
}) {
  const { entite, immeuble } = await searchParams;
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
        / <span className="text-slate-700">Nouveau</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ajouter un bien</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rattaché à un immeuble (lot) ou indépendant, le bien appartient toujours à une entité.
        </p>
      </header>
      <div className="card p-5 sm:p-6">
        <PropertyForm
          entities={entities}
          buildings={buildings}
          defaultEntityId={entite}
          defaultBuildingId={immeuble}
        />
      </div>
    </div>
  );
}
