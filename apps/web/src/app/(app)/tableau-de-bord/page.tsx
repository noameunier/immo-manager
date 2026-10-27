import type { Metadata } from 'next';
import Link from 'next/link';
import type { DashboardSummary } from '@immo/shared';
import {
  OCCUPANCY_STATUS_LABELS,
  OWNER_ENTITY_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
} from '@immo/shared';
import { formatCurrency, formatNumber, formatSurface } from '@/lib/format';
import { serverFetch } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Tableau de bord' };

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link href={href} className="card block p-5 transition hover:border-brand-300 hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Link>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const { bienvenue } = await searchParams;
  const summary = await serverFetch<DashboardSummary>('/dashboard/summary');

  const isEmpty =
    summary.entities.total === 0 && summary.buildings.total === 0 && summary.properties.total === 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vue d’ensemble de votre patrimoine, calculée à partir de vos données réelles.
        </p>
      </header>

      {bienvenue ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <p className="font-semibold">Bienvenue dans Immo Manager.</p>
          <p className="mt-1">
            Votre compte est créé. Commencez par ajouter une entité propriétaire (vous-même, une
            SCI, une société ou une indivision), puis vos immeubles et vos biens.
          </p>
        </div>
      ) : null}

      {isEmpty ? (
        <section className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Votre patrimoine est vide</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Ajoutez d’abord une entité propriétaire : c’est elle qui portera vos immeubles et vos
            biens. Vous pourrez ensuite créer un immeuble et y rattacher des lots.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/entites/nouvelle" className="btn-primary">
              Ajouter une entité
            </Link>
            <Link href="/biens/nouveau" className="btn-secondary">
              Ajouter un bien indépendant
            </Link>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="indicateurs">
        <h2 id="indicateurs" className="sr-only">
          Indicateurs clés
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Entités propriétaires"
            value={formatNumber(summary.entities.total)}
            href="/entites"
          />
          <StatCard
            label="Immeubles"
            value={formatNumber(summary.buildings.total)}
            href="/immeubles"
          />
          <StatCard
            label="Biens"
            value={formatNumber(summary.properties.total)}
            hint={`${formatNumber(summary.properties.lots)} lot(s) · ${formatNumber(
              summary.properties.independent,
            )} indépendant(s)`}
            href="/biens"
          />
          <div className="card p-5">
            <p className="text-sm font-medium text-slate-500">Surface totale</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {formatSurface(summary.properties.totalSurfaceM2)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Somme des surfaces renseignées</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Locataires"
            value={formatNumber(summary.tenants.total)}
            href="/locataires"
          />
          <StatCard
            label="Baux actifs"
            value={formatNumber(summary.leases.active)}
            hint={
              summary.leases.upcoming > 0
                ? `${formatNumber(summary.leases.upcoming)} à venir`
                : 'Aucun bail à venir'
            }
            href="/baux"
          />
          <StatCard
            label="Loyer mensuel"
            value={formatCurrency(summary.rents.monthlyTotal)}
            hint={`${formatCurrency(summary.rents.monthlyRent)} de loyer + ${formatCurrency(
              summary.rents.monthlyCharges,
            )} de charges`}
            href="/baux"
          />
          <div className="card p-5">
            <p className="text-sm font-medium text-slate-500">Baux à échéance</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {formatNumber(summary.leases.endingSoon)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Baux actifs finissant sous 60 jours</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="repartition-entites">
          <h2 id="repartition-entites" className="text-sm font-semibold text-slate-900">
            Entités par type
          </h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(OWNER_ENTITY_TYPE_LABELS).map(([type, label]) => {
              const count = summary.entities.byType[type as keyof typeof summary.entities.byType];
              return (
                <li key={type} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="repartition-biens">
          <h2 id="repartition-biens" className="text-sm font-semibold text-slate-900">
            Biens par type
          </h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(PROPERTY_TYPE_LABELS).map(([type, label]) => {
              const count =
                summary.properties.byType[type as keyof typeof summary.properties.byType];
              return (
                <li key={type} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="occupation">
          <h2 id="occupation" className="text-sm font-semibold text-slate-900">
            Occupation
          </h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(OCCUPANCY_STATUS_LABELS).map(([status, label]) => {
              const count =
                summary.properties.byOccupancy[
                  status as keyof typeof summary.properties.byOccupancy
                ];
              return (
                <li key={status} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="archives">
          <h2 id="archives" className="text-sm font-semibold text-slate-900">
            Éléments archivés
          </h2>
          <ul className="mt-4 space-y-3">
            {[
              ['Entités', summary.archived.entities],
              ['Immeubles', summary.archived.buildings],
              ['Biens', summary.archived.properties],
              ['Locataires', summary.archived.tenants],
              ['Baux', summary.archived.leases],
            ].map(([label, count]) => (
              <li key={String(label)} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-900">{count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Les archives restent consultables et peuvent être restaurées.
          </p>
        </section>
      </div>
    </div>
  );
}
