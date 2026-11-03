import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { productsApi } from '@/lib/api/products';
import { companiesApi } from '@/lib/api/companies';
import { warehousesApi } from '@/lib/api/warehouses';
import { fleetApi } from '@/lib/api/fleet';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import { UploadCloseModal } from '@/components/orders/UploadCloseModal';
import { formatApiError } from '@/lib/http/errors';
import { showToast } from '@/stores/toastStore';
import { NEXT_STATUS, canAdvance, ORDER_STATUS_VALUES, type OrderStatus } from '@erp/domain';

const STATUS_COLORS: Record<OrderStatus, string> = {
  Requested: '#f59e0b',
  Approved:  '#3b82f6',
  Delivered: '#10b981',
  Closed:    '#64748b',
  Rejected:  '#dc2626',
};

export default function OrderDetailScreen(): React.ReactElement {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [showUploadClose, setShowUploadClose] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orderDetail(id!),
    queryFn:  () => ordersApi.getById(id!),
    enabled:  !!id,
  });
  const { data: products }   = useQuery({ queryKey: queryKeys.products,   queryFn: productsApi.getAll });
  const { data: companies }  = useQuery({ queryKey: queryKeys.companies,  queryFn: companiesApi.getAll });
  const { data: warehouses } = useQuery({ queryKey: queryKeys.warehouses, queryFn: warehousesApi.getAll });
  const { data: drivers }    = useQuery({ queryKey: queryKeys.drivers,    queryFn: fleetApi.getAllDrivers });

  // Resolve the exact product/warehouse referenced by this order directly by
  // ID, so the name shows even when the entity isn't in the cached list
  // (deleted, paginated, or not yet loaded). Falls back to the list lookup.
  const { data: productInfo } = useQuery({
    queryKey: queryKeys.productDetail(data?.productId ?? ''),
    queryFn:  () => productsApi.getById(data!.productId),
    enabled:  !!data?.productId,
  });
  const { data: warehouseInfo } = useQuery({
    queryKey: queryKeys.warehouseDetail(data?.warehouseId ?? ''),
    queryFn:  () => warehousesApi.getById(data!.warehouseId),
    enabled:  !!data?.warehouseId,
  });

  const nameById = (list: { id: string; name: string }[] | undefined, fkId: string): string =>
    list?.find((x) => x.id === fkId)?.name ?? `${fkId.slice(0, 8)}…`;

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id!, ORDER_STATUS_VALUES[status]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(id!) });
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const color = STATUS_COLORS[data.status];
  const next  = NEXT_STATUS[data.status];

  const isRequested = data.status === 'Requested';
  const warehouse   = warehouses?.find((w) => w.id === data.warehouseId);
  const available   = warehouse ? warehouse.totalCapacity - warehouse.usedCapacity : Number.POSITIVE_INFINITY;

  const doApprove = () =>
    statusMutation.mutate('Approved', { onSuccess: () => showToast(sl.orders.approvedToast, 'success') });
  const doReject = () =>
    statusMutation.mutate('Rejected', { onSuccess: () => showToast(sl.orders.rejectedToast, 'success') });

  const onRejectPress = () => {
    Alert.alert(sl.orders.doNotApprove, sl.orders.rejectConfirm, [
      { text: sl.common.cancel,       style: 'cancel' },
      { text: sl.orders.doNotApprove, style: 'destructive', onPress: doReject },
    ]);
  };

  const onApprovePress = () => {
    if (data.quantity > available) {
      const body = sl.orders.capacityWarnBody
        .replace('{qty}', String(data.quantity))
        .replace('{available}', String(Math.max(0, available)))
        .replace('{capacity}', String(warehouse ? warehouse.totalCapacity : 0));
      Alert.alert(sl.orders.capacityWarnTitle, body, [
        { text: sl.common.cancel,       style: 'cancel' },
        { text: sl.orders.doNotApprove, style: 'destructive', onPress: doReject },
        { text: sl.orders.approveAnyway, onPress: doApprove },
      ]);
    } else {
      doApprove();
    }
  };

  const confirmAdvance = (target: OrderStatus) => {
    // Delivered -> Closed: require a delivery document upload first, matching
    // the web orders-mf flow.
    if (data.status === 'Delivered' && target === 'Closed') {
      setShowUploadClose(true);
      return;
    }
    Alert.alert(
      sl.orders.updateStatus,
      `${sl.orders.statuses[data.status]} → ${sl.orders.statuses[target]}`,
      [
        { text: sl.common.cancel, style: 'cancel' },
        { text: sl.common.save,   onPress: () => statusMutation.mutate(target) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>#{data.id.slice(0, 8)}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, { borderLeftColor: color }]}>
          <Text style={styles.fieldLabel}>{sl.orders.status}</Text>
          <Text style={[styles.statusValue, { color }]}>{sl.orders.statuses[data.status]}</Text>
        </View>

        <Field label={sl.orders.quantity}     value={String(data.quantity)} />
        <Field label={sl.orders.product}      value={productInfo?.name   ?? nameById(products,   data.productId)} />
        <Field label={sl.orders.warehouse}    value={warehouseInfo?.name ?? nameById(warehouses, data.warehouseId)} />
        <Field label={sl.orders.company}      value={nameById(companies,  data.companyId)} />
        <Field label={sl.orders.driver}       value={nameById(drivers,    data.driverId)} />
        <Field label={sl.orders.deliveryDate} value={data.deliveryDate ? new Date(data.deliveryDate).toLocaleString('sl-SI') : '—'} />
        <Field label={sl.orders.created}      value={new Date(data.createdAt).toLocaleString('sl-SI')} />

        {isRequested && (
          <RoleGate feature="ORDERS_STATUS_UPDATE">
            <View style={styles.approveRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, statusMutation.isPending && styles.btnDisabled]}
                onPress={onRejectPress}
                disabled={statusMutation.isPending}
              >
                <Text style={styles.rejectBtnText}>✕ {sl.orders.doNotApprove}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, statusMutation.isPending && styles.btnDisabled]}
                onPress={onApprovePress}
                disabled={statusMutation.isPending}
              >
                <Text style={styles.approveBtnText}>✓ {sl.orders.approve}</Text>
              </TouchableOpacity>
            </View>
          </RoleGate>
        )}

        {!isRequested && canAdvance(data.status) && next && (
          <RoleGate feature="ORDERS_STATUS_UPDATE">
            <TouchableOpacity
              style={[styles.advBtn, statusMutation.isPending && styles.btnDisabled]}
              onPress={() => confirmAdvance(next)}
              disabled={statusMutation.isPending}
            >
              <Text style={styles.advBtnText}>→ {sl.orders.statuses[next]}</Text>
            </TouchableOpacity>
          </RoleGate>
        )}
      </ScrollView>

      {showUploadClose && (
        <UploadCloseModal
          orderId={data.id}
          onClose={() => setShowUploadClose(false)}
        />
      )}
    </SafeAreaView>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f1f5f9' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerBtn:   { color: '#3b82f6', fontSize: 15 },
  title:       { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'center' },
  content:     { padding: 16, gap: 4 },
  statusCard:  { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 3 },
  statusValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  field:       { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8 },
  fieldLabel:  { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  fieldValue:  { fontSize: 15, color: '#1e293b' },
  mono:        { fontFamily: 'monospace', fontSize: 11, color: '#475569' },
  advBtn:      { marginTop: 12, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  advBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  approveRow:    { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveBtn:    { flex: 1, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  approveBtnText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  rejectBtn:     { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  rejectBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
});
