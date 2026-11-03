import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { warehousesApi } from '@/lib/api/warehouses';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import type { WarehouseResponse } from '@erp/api-types';

export default function WarehousesScreen(): React.ReactElement {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.warehouses,
    queryFn:  warehousesApi.getAll,
  });

  if (isLoading) return <LoadingView />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const items = data ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.warehouses.title}</Text>
        <RoleGate feature="WAREHOUSES_WRITE">
          <TouchableOpacity onPress={() => router.push('/(tabs)/more/warehouses/new')}>
            <Text style={styles.add}>＋</Text>
          </TouchableOpacity>
        </RoleGate>
      </View>
      <FlatList
        data={items}
        keyExtractor={(w) => w.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏬</Text>
            <Text style={styles.empty}>{sl.warehouses.notFound}</Text>
            <RoleGate feature="WAREHOUSES_WRITE">
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/more/warehouses/new')}>
                <Text style={styles.emptyCtaText}>{sl.warehouses.newWarehouse}</Text>
              </TouchableOpacity>
            </RoleGate>
          </View>
        }
        renderItem={({ item }) => (
          <WarehouseCard
            item={item}
            onPress={() => router.push({ pathname: '/(tabs)/more/warehouses/[id]', params: { id: item.id } })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function WarehouseCard({ item, onPress }: { item: WarehouseResponse; onPress: () => void }): React.ReactElement {
  const pct = item.totalCapacity > 0 ? item.usedCapacity / item.totalCapacity : 0;
  const barColor = pct > 0.9 ? '#dc2626' : pct > 0.7 ? '#f59e0b' : '#10b981';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>{item.city}, {item.country}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.capacity}>
        {item.usedCapacity} / {item.totalCapacity}  ({Math.round(pct * 100)}%)
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back:           { color: '#3b82f6', fontSize: 15 },
  title:          { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  add:            { color: '#3b82f6', fontSize: 22 },
  list:           { padding: 12, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyState:     { alignItems: 'center', gap: 12 },
  emptyIcon:      { fontSize: 48 },
  empty:          { color: '#94a3b8' },
  emptyCta:       { marginTop: 4, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyCtaText:   { color: '#fff', fontWeight: '600', fontSize: 13 },
  card:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2 },
  name:           { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  meta:           { fontSize: 12, color: '#64748b', marginBottom: 10 },
  barBg:          { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 4 },
  barFill:        { height: 6, borderRadius: 3 },
  capacity:       { fontSize: 11, color: '#64748b' },
});
