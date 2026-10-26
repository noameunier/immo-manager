import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getSession } from '@/lib/server-api';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/connexion');

  return <AppShell user={session.user}>{children}</AppShell>;
}
