import type { Metadata } from 'next';
import Link from 'next/link';
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';

export const metadata: Metadata = { title: 'Vérifier mon adresse email' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Lien invalide</h1>
        <p className="text-sm text-slate-600">
          Ce lien de vérification est incomplet. Connectez-vous pour demander un nouvel email.
        </p>
        <Link href="/connexion" className="btn-primary w-full">
          Se connecter
        </Link>
      </div>
    );
  }

  return <VerifyEmailPanel token={token} />;
}
