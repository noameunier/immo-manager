import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{symbol}</Text>;
}

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Redirect href="/connexion" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="tableau-de-bord"
        options={{
          title: 'Tableau de bord',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="biens"
        options={{
          title: 'Mes biens',
          tabBarLabel: 'Biens',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🏢" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon symbol="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen name="biens/[id]" options={{ href: null, title: 'Fiche du bien' }} />
    </Tabs>
  );
}
