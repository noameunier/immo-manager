import { Redirect } from 'expo-router';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Redirect href="/connexion" />;
  return <Redirect href="/tableau-de-bord" />;
}
