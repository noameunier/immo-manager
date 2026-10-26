import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ResendVerificationButton } from '@/components/auth/resend-verification-button';
import { formatDate, formatDateTime } from '@/lib/format';
import { getSession } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/connexion');

  const { user } = session;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Profil</h1>
        <p className="mt-1 text-sm text-slate-500">Informations de votre compte et sécurité.</p>
      </header>

      <section className="card p-5" aria-labelledby="compte">
        <h2 id="compte" className="text-sm font-semibold text-slate-900">
          Compte
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Nom complet</dt>
            <dd className="text-slate-900">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Adresse email</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Email vérifié</dt>
            <dd className={user.emailVerified ? 'text-emerald-700' : 'text-amber-700'}>
              {user.emailVerified ? 'Oui' : 'Non'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Compte créé le</dt>
            <dd className="text-slate-900">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Langue</dt>
            <dd className="text-slate-900">{user.locale}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Fuseau horaire</dt>
            <dd className="text-slate-900">{user.timezone}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Session valable jusqu’au</dt>
            <dd className="text-slate-900">{formatDateTime(session.expiresAt)}</dd>
          </div>
        </dl>
      </section>

      {!user.emailVerified ? (
        <section className="card p-5" aria-labelledby="verification">
          <h2 id="verification" className="text-sm font-semibold text-slate-900">
            Vérification de l’adresse email
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Votre adresse n’est pas encore confirmée. Certaines fonctionnalités pourront être
            restreintes jusqu’à la vérification.
          </p>
          <div className="mt-4">
            <ResendVerificationButton />
          </div>
        </section>
      ) : null}

      <section className="card p-5" aria-labelledby="securite">
        <h2 id="securite" className="text-sm font-semibold text-slate-900">
          Sécurité
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Pour changer de mot de passe, utilisez la procédure de réinitialisation : elle révoque
          automatiquement toutes vos sessions actives.
        </p>
        <Link href="/mot-de-passe-oublie" className="btn-secondary mt-4">
          Changer mon mot de passe
        </Link>
      </section>
    </div>
  );
}
