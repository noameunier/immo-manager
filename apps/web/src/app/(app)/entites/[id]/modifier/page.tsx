import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { OwnerEntity } from '@immo/shared';
import { ApiError } from '@/lib/api';
import { EntityForm } from '@/components/entities/entity-form';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Modifier une entité' };

export default async function EditEntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let entity: OwnerEntity;
  try {
    entity = await serverFetch<OwnerEntity>(`/owner-entities/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/entites" className="hover:text-brand-700">
          Entités
        </Link>{' '}
        /{' '}
        <Link href={`/entites/${id}`} className="hover:text-brand-700">
          {entity.name}
        </Link>{' '}
        / <span className="text-slate-700">Modifier</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Modifier « {entity.name} »
        </h1>
      </header>
      <div className="card p-5 sm:p-6">
        <EntityForm entity={entity} />
      </div>
    </div>
  );
}
