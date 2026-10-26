import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-brand-50 via-slate-50 to-slate-100 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-lg font-bold text-white">
            IM
          </span>
          <span className="text-xl font-semibold tracking-tight text-slate-900">Immo Manager</span>
        </Link>
        <div className="card p-6 sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Vos données restent privées : chaque compte ne voit que son propre patrimoine.
        </p>
      </div>
    </div>
  );
}
