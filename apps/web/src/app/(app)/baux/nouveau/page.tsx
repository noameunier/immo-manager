import type { Metadata } from 'next';
import Link from 'next/link';
import type { OwnerEntity, Property, Tenant } from '@immo/shared';
import { LeaseForm } from '@/components/leases/lease-form';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Nouveau bail' };

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ bien?: string; locataire?: string }>;
}) {
  const { bien, locataire } = await searchParams;
  const [entities, properties, tenants] = await Promise.all([
    serverFetch<OwnerEntity[]>('/owner-entities'),
    serverFetch<Property[]>('/properties'),
    serverFetch<Tenant[]>('/tenants'),
  ]);

  const missingPrerequisites =
    entities.length === 0 || properties.length === 0 || tenants.length === 0;

  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
        <Link href="/baux" className="hover:text-brand-700">
          Baux
        </Link>{' '}
        / <span className="text-slate-700">Nouveau</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Créer un bail</h1>
        <p className="mt-1 text-sm text-slate-500">
          Un bail relie une entité bailleur, un bien et un locataire.
        </p>
      </header>

      {missingPrerequisites ? (
        <div className="card p-5 text-sm text-slate-700">
          <p className="font-medium">Il manque une donnée pour créer un bail.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
            {entities.length === 0 ? (
              <li>
                Créez d’abord une{' '}
                <Link href="/entites/nouvelle" className="text-brand-700 hover:underline">
                  entité propriétaire
                </Link>
                .
              </li>
            ) : null}
            {properties.length === 0 ? (
              <li>
                Ajoutez un{' '}
                <Link href="/biens/nouveau" className="text-brand-700 hover:underline">
                  bien
                </Link>
                .
              </li>
            ) : null}
            {tenants.length === 0 ? (
              <li>
                Ajoutez un{' '}
                <Link href="/locataires/nouveau" className="text-brand-700 hover:underline">
                  locataire
                </Link>
                .
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <div className="card p-5 sm:p-6">
          <LeaseForm
            entities={entities}
            properties={properties}
            tenants={tenants}
            defaultPropertyId={bien}
            defaultTenantId={locataire}
          />
        </div>
      )}
    </div>
  );
}
