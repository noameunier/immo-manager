import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Tenant } from '@immo/shared';
import { TenantForm } from '@/components/tenants/tenant-form';
import { ApiError } from '@/lib/api';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Modifier un locataire' };

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let tenant: Tenant;
  try {
    tenant = await serverFetch<Tenant>(`/tenants/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/locataires" className="hover:text-brand-700">
          Locataires
        </Link>{' '}
        /{' '}
        <Link href={`/locataires/${id}`} className="hover:text-brand-700">
          {tenant.name}
        </Link>{' '}
        / <span className="text-slate-700">Modifier</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Modifier « {tenant.name} »
        </h1>
      </header>
      <div className="card p-5 sm:p-6">
        <TenantForm tenant={tenant} />
      </div>
    </div>
  );
}
