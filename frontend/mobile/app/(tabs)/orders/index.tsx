import React, { useState } from 'react';
import { View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ordersApi } from '@/lib/api/orders';
import { productsApi } from '@/lib/api/products';
import { companiesApi } from '@/lib/api/companies';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import { UploadCloseModal } from '@/components/orders/UploadCloseModal';
import { formatApiError } from '@/lib/http/errors';
import { NEXT_STATUS, canAdvance, ORDER_STATUS_VALUES, type OrderStatus } from '@erp/domain';
import { type OrderResponse } from '@erp/api-types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  Requested: '#f59e0b',
  Approved:  '#3b82f6',
  Delivered: '#10b981',
  Closed:    '#64748b',
  Rejected:  '#dc2626',
};

export default function OrdersScreen(): React.ReactElement {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [filter,         setFilter]         = useState<OrderStatus | null>(null);
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders,
    queryFn:  ordersApi.getAll,
  });
  const { data: products }  = useQuery({ queryKey: queryKeys.products,  queryFn: productsApi.getAll });
  const { data: companies } = useQuery({ queryKey: queryKeys.companies, queryFn: companiesApi.getAll });

  const productName = React.useMemo(() => {
    const m: Record<string, string> = {};
    products?.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [products]);
  const companyName = React.useMemo(() => {
    const m: Record<string, string> = {};
    companies?.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [companies]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, ORDER_STATUS_VALUES[status]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
    onError:   (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  if (isLoading) return <LoadingView />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const orders = filter ? (data ?? []).filter((o) => o.status === filter) : (data ?? []);

  return (
    <SafeAreaView style={styles.root} edges={['left','right','bottom']}>
      {/* Status filter */}
      <View style={styles.filterRow}>
        {([null, 'Requested', 'Approved', 'Delivered', 'Closed', 'Rejected'] as (OrderStatus | null)[]).map((s) => (
          <TouchableOpacity
            key={s ?? 'all'}
            style={[styles.chip, filter === s && styles.chipActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>
              {s ? sl.orders.statuses[s] : sl.orders.all}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{sl.orders.noOrders}</Text>}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            productName={productName[item.productId] ?? item.productId.slice(0, 8) + '…'}
            companyName={companyName[item.companyId] ?? item.companyId.slice(0, 8) + '…'}
            onPress={() => router.push({ pathname: '/(tabs)/orders/[id]', params: { id: item.id } })}
            onAdvance={() => {
              const next = NEXT_STATUS[item.status];
              if (!next) return;
              // Delivered -> Closed requires a delivery document upload first,
              // matching the web orders-mf flow.
              if (item.status === 'Delivered' && next === 'Closed') {
                setClosingOrderId(item.id);
                return;
              }
              Alert.alert(
                sl.orders.updateStatus,
                `${sl.orders.statuses[item.status]} → ${sl.orders.statuses[next]}`,
                [
                  { text: sl.common.cancel, style: 'cancel' },
                  { text: sl.common.save, onPress: () => statusMutation.mutate({ id: item.id, status: next }) },
                ],
              );
            }}
          />
        )}
      />

      <RoleGate feature="ORDERS_WRITE">
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/orders/create')}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </RoleGate>

      {closingOrderId && (
        <UploadCloseModal
          orderId={closingOrderId}
          onClose={() => setClosingOrderId(null)}
        />
      )}
    </SafeAreaView>
  );
}

function OrderCard({
  order, productName, companyName, onAdvance, onPress,
}: {
  order: OrderResponse;
  productName: string;
  companyName: string;
  onAdvance: () => void;
  onPress: () => void;
}): React.ReactElement {
  const color  = STATUS_COLORS[order.status];
  // Requested orders are approved/rejected from the detail screen (which runs
  // the warehouse-capacity check), so the quick-advance shortcut is hidden here.
  const canAdv = canAdvance(order.status) && order.status !== 'Requested';

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId} numberOfLines={1}>{productName}</Text>
        <View style={[styles.badge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.badgeText, { color }]}>{sl.orders.statuses[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.subTitle} numberOfLines={1}>{companyName}</Text>
      <Text style={styles.meta}>{sl.orders.quantity}: {order.quantity}  ·  {new Date(order.createdAt).toLocaleDateString('sl-SI')}</Text>
      {canAdv && (
        <TouchableOpacity style={styles.advBtn} onPress={(e) => { e.stopPropagation?.(); onAdvance(); }}>
          <Text style={styles.advBtnText}>
            → {sl.orders.statuses[NEXT_STATUS[order.status]!]}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },
  filterRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  chip:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive:     { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  chipText:       { fontSize: 11, color: '#64748b' },
  chipTextActive: { color: '#3b82f6', fontWeight: '600' },
  list:           { padding: 12, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  empty:          { color: '#94a3b8', fontSize: 14 },
  card:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 3, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId:        { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  subTitle:       { fontSize: 12, color: '#475569', marginBottom: 6 },
  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:      { fontSize: 11, fontWeight: '600' },
  meta:           { fontSize: 12, color: '#64748b', marginBottom: 10 },
  advBtn:         { alignSelf: 'flex-start', backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  advBtnText:     { color: '#3b82f6', fontWeight: '600', fontSize: 12 },
  fab:            { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabText:        { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
