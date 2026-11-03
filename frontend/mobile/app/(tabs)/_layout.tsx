import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sl } from '@/constants/i18n';
import { useNotificationsSocket } from '@/hooks/realtime/useNotifications';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import { queryKeys } from '@erp/domain';

function UnreadBadge(): number | undefined {
  const { data } = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn:  notificationsApi.getUnread,
    refetchInterval: 30_000, // polling fallback — 30s
  });
  return data?.length ?? undefined;
}

export default function TabLayout(): React.ReactElement {
  useNotificationsSocket();   // WS + cache invalidation for the lifetime of the tab shell
  usePushRegistration();      // best-effort Expo push token registration
  const unreadCount = UnreadBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown:      true,
        tabBarActiveTintColor:   '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { borderTopColor: '#e2e8f0' },
        headerStyle:  { backgroundColor: '#1e293b' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: sl.tabs.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: sl.tabs.stock,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: sl.tabs.orders,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: sl.tabs.notifications,
          tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: sl.tabs.more,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
