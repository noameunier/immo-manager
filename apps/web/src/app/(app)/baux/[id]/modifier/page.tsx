import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Lease, OwnerEntity, Property, Tenant } from '@immo/shared';
import { LeaseForm } from '@/components/leases/lease-form';
import { ApiError } from '@/lib/api';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Modifier un bail' };

export default async function EditLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let lease: Lease;
  try {
    lease = await serverFetch<Lease>(`/leases/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [entities, properties, tenants] = await Promise.all([
    serverFetch<OwnerEntity[]>('/owner-entities'),
    serverFetch<Property[]>('/properties'),
    serverFetch<Tenant[]>('/tenants'),
  ]);

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/baux" className="hover:text-brand-700">
          Baux
        </Link>{' '}
        /{' '}
        <Link href={`/baux/${id}`} className="hover:text-brand-700">
          {lease.property?.name ?? 'Bail'}
        </Link>{' '}
        / <span className="text-slate-700">Modifier</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Modifier le bail</h1>
      </header>
      <div className="card p-5 sm:p-6">
        <LeaseForm entities={entities} properties={properties} tenants={tenants} lease={lease} />
      </div>
    </div>
  );
}
