import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server-api';

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? '/tableau-de-bord' : '/connexion');
}
