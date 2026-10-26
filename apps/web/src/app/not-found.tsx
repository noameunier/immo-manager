import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Erreur 404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        La page demandée n’existe pas ou la ressource appartient à un autre compte.
      </p>
      <Link href="/tableau-de-bord" className="btn-primary mt-6">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
