import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { SwipeableTabs } from '../../components/SwipeableTabs';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <SwipeableTabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 20,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 35,
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 20,
        },
        tabBarIndicatorStyle: {
          height: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          textTransform: 'none',
          fontWeight: '700',
        },
        tabBarItemStyle: {
          padding: 0,
          paddingTop: 8,
          margin: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarShowIcon: true,
        swipeEnabled: true,
      }}
    >
      <SwipeableTabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <SwipeableTabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="swap-horizontal" size={24} color={color} />,
        }}
      />
      <SwipeableTabs.Screen
        name="chat"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="chatbubbles" size={24} color={color} />,
        }}
      />
      <SwipeableTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </SwipeableTabs>
  );
}
