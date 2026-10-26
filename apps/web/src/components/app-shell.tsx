'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AuthenticatedUser } from '@immo/shared';
import { apiFetch } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/entites', label: 'Entités' },
  { href: '/immeubles', label: 'Immeubles' },
  { href: '/biens', label: 'Biens' },
  { href: '/profil', label: 'Profil' },
];

export function AppShell({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/connexion');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link href="/tableau-de-bord" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              IM
            </span>
            <span className="text-base font-semibold tracking-tight">Immo Manager</span>
          </Link>
        </div>

        <nav aria-label="Navigation principale" className="px-2 pb-2 lg:px-3">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-brand-50 text-brand-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden border-t border-slate-200 px-5 py-4 lg:block">
          <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          {!user.emailVerified ? (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
              Email non vérifié
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-3 text-sm font-medium text-slate-600 hover:text-red-700 disabled:opacity-60"
          >
            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm font-medium text-slate-600 hover:text-red-700"
          >
            {loggingOut ? '…' : 'Déconnexion'}
          </button>
        </div>

        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
