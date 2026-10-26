import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Réinitialiser le mot de passe' };

export default async function ResetPasswordPage({
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
          Ce lien de réinitialisation est incomplet. Demandez un nouveau lien.
        </p>
        <Link href="/mot-de-passe-oublie" className="btn-primary w-full">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
