import type { Metadata } from 'next';
import Link from 'next/link';
import { EntityForm } from '@/components/entities/entity-form';

export const metadata: Metadata = { title: 'Nouvelle entité' };

export default function NewEntityPage() {
  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/entites" className="hover:text-brand-700">
          Entités
        </Link>{' '}
        / <span className="text-slate-700">Nouvelle</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Ajouter une entité propriétaire
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Une entité regroupe les biens d’un même propriétaire juridique.
        </p>
      </header>
      <div className="card p-5 sm:p-6">
        <EntityForm />
      </div>
    </div>
  );
}
