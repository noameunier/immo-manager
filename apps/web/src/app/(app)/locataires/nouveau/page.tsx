import type { Metadata } from 'next';
import Link from 'next/link';
import { TenantForm } from '@/components/tenants/tenant-form';

export const metadata: Metadata = { title: 'Nouveau locataire' };

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/locataires" className="hover:text-brand-700">
          Locataires
        </Link>{' '}
        / <span className="text-slate-700">Nouveau</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Ajouter un locataire
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Les coordonnées servent aux baux, aux courriers et aux états des lieux.
        </p>
      </header>
      <div className="card p-5 sm:p-6">
        <TenantForm />
      </div>
    </div>
  );
}
