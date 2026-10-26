import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
      <LoginForm />
    </Suspense>
  );
}
