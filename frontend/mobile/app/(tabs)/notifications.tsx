import React from 'react';
import { View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { useNotificationsSocket } from '@/hooks/realtime/useNotifications';
import type { NotificationResponse } from '@erp/api-types';

const SEVERITY_COLORS: Record<string, string> = {
  INFO:    '#3b82f6',
  WARNING: '#f59e0b',
  ERROR:   '#dc2626',
  SUCCESS: '#16a34a',
};

export default function NotificationsScreen(): React.ReactElement {
  const queryClient = useQueryClient();
  const { connected, fallbackActive } = useNotificationsSocket();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn:  notificationsApi.getAll,
    // Poll only when WS has given up — WS-driven invalidations keep the cache fresh
    // when it is connected (see hooks/realtime/useNotifications.ts).
    refetchInterval: fallbackActive ? 30_000 : false,
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
    },
  });

  if (isLoading) return <LoadingView />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const items = data ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['left','right','bottom']}>
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#10b981' : fallbackActive ? '#f59e0b' : '#94a3b8' }]} />
        <Text style={styles.statusText}>
          {connected
            ? sl.notifications.liveOn
            : fallbackActive
              ? sl.notifications.pollingFallback
              : sl.common.loading}
        </Text>
      </View>

      {items.some((n) => !n.read) && (
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={() => markAll.mutate()}
          disabled={markAll.isPending}
        >
          <Text style={styles.markAllText}>{sl.notifications.markAll}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{sl.notifications.noItems}</Text>}
        renderItem={({ item }) => (
          <NotificationCard item={item} onMarkRead={() => markOne.mutate(item.id)} />
        )}
      />
    </SafeAreaView>
  );
}

function NotificationCard({ item, onMarkRead }: { item: NotificationResponse; onMarkRead: () => void }): React.ReactElement {
  const color = SEVERITY_COLORS[item.severity?.toUpperCase()] ?? '#3b82f6';
  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread, { borderLeftColor: color }]}
      onPress={onMarkRead}
      disabled={item.read}
    >
      <View style={styles.cardRow}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {!item.read && <View style={styles.dot} />}
      </View>
      <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
      <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('sl-SI')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },
  statusBar:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  statusText:     { fontSize: 11, color: '#64748b' },
  markAllBtn:     { margin: 12, marginBottom: 0, padding: 10, backgroundColor: '#dbeafe', borderRadius: 8, alignItems: 'center' },
  markAllText:    { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
  list:           { padding: 12, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  empty:          { color: '#94a3b8', fontSize: 14 },
  card:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 3, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardUnread:     { backgroundColor: '#fefce8' },
  cardRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title:          { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginTop: 4 },
  body:           { fontSize: 13, color: '#64748b', marginBottom: 6 },
  time:           { fontSize: 11, color: '#94a3b8' },
});
