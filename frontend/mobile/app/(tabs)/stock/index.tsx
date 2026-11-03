import React, { useState } from 'react';
import { View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { inventoryApi } from '@/lib/api/inventory';
import { warehousesApi } from '@/lib/api/warehouses';
import { productsApi } from '@/lib/api/products';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import { useHasFeature } from '@/hooks/useHasFeature';
import { formatApiError } from '@/lib/http/errors';
import type { InventoryResponse } from '@erp/api-types';

export default function StockScreen(): React.ReactElement {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const canWrite     = useHasFeature('INVENTORY_WRITE');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [editing,           setEditing]           = useState<InventoryResponse | null>(null);

  const { data: warehouses } = useQuery({
    queryKey: queryKeys.warehouses,
    queryFn:  warehousesApi.getAll,
  });
  const { data: products } = useQuery({
    queryKey: queryKeys.products,
    queryFn:  productsApi.getAll,
  });

  const stockQuery = useQuery({
    queryKey: selectedWarehouse ? queryKeys.stockByWarehouse(selectedWarehouse) : queryKeys.stockAll,
    queryFn:  () => selectedWarehouse
      ? inventoryApi.getByWarehouse(selectedWarehouse)
      : inventoryApi.getAll(),
  });

  const warehouseMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    warehouses?.forEach((w) => { m[w.id] = w.name; });
    return m;
  }, [warehouses]);
  const productMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    products?.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [products]);

  const thresholdsMutation = useMutation({
    mutationFn: (req: { productId: string; warehouseId: string; minQuantity: number | null; maxQuantity: number | null }) =>
      inventoryApi.updateThresholds(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAll });
      if (selectedWarehouse) queryClient.invalidateQueries({ queryKey: queryKeys.stockByWarehouse(selectedWarehouse) });
      setEditing(null);
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  if (stockQuery.isLoading) return <LoadingView />;
  if (stockQuery.isError)   return <ErrorView onRetry={stockQuery.refetch} />;

  const items = stockQuery.data ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['left','right','bottom']}>
      {/* Warehouse filter chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, !selectedWarehouse && styles.chipActive]}
          onPress={() => setSelectedWarehouse(null)}
        >
          <Text style={[styles.chipText, !selectedWarehouse && styles.chipTextActive]}>
            {sl.stock.allWarehouses}
          </Text>
        </TouchableOpacity>
        {warehouses?.map((w) => (
          <TouchableOpacity
            key={w.id}
            style={[styles.chip, selectedWarehouse === w.id && styles.chipActive]}
            onPress={() => setSelectedWarehouse(w.id)}
          >
            <Text style={[styles.chipText, selectedWarehouse === w.id && styles.chipTextActive]}>
              {w.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl refreshing={stockQuery.isFetching} onRefresh={stockQuery.refetch} />
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.empty}>{sl.stock.noItems}</Text>
            <Text style={styles.emptyHint}>{sl.stock.stockFromOrders}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <StockCard
            item={item}
            warehouseName={warehouseMap[item.warehouseId] ?? item.warehouseId.slice(0, 8) + '…'}
            productName={productMap[item.productId] ?? item.productId.slice(0, 8) + '…'}
            canWrite={canWrite}
            onEditThresholds={() => setEditing(item)}
          />
        )}
      />

      {/* Stock only grows when an order is closed (delivery acknowledged), so
          the only manual action here is consuming (issuing) existing stock. */}
      <RoleGate feature="INVENTORY_WRITE">
        <TouchableOpacity
          style={styles.consumeFab}
          onPress={() => router.push('/(tabs)/stock/consume')}
        >
          <Text style={styles.consumeFabText}>{sl.stock.consumeStock}</Text>
        </TouchableOpacity>
      </RoleGate>

      {editing && (
        <EditThresholdsModal
          item={editing}
          productName={productMap[editing.productId] ?? editing.productId.slice(0, 8) + '…'}
          warehouseName={warehouseMap[editing.warehouseId] ?? editing.warehouseId.slice(0, 8) + '…'}
          submitting={thresholdsMutation.isPending}
          onCancel={() => setEditing(null)}
          onSubmit={(minQuantity, maxQuantity) => thresholdsMutation.mutate({
            productId:   editing.productId,
            warehouseId: editing.warehouseId,
            minQuantity,
            maxQuantity,
          })}
        />
      )}
    </SafeAreaView>
  );
}

function StockCard({
  item, warehouseName, productName, canWrite, onEditThresholds,
}: {
  item: InventoryResponse;
  warehouseName: string;
  productName: string;
  canWrite: boolean;
  onEditThresholds: () => void;
}): React.ReactElement {
  // Gap 13 closed: use the server-supplied min threshold when present.
  // Items still without thresholds (created pre-migration) get a sensible
  // default so the badge stays visible for the warehouse manager.
  const minQty = item.minQuantity ?? 10;
  const isLow  = item.quantity < minQty;
  return (
    <View style={[styles.card, isLow && styles.cardLow]}>
      <View style={styles.cardHeader}>
        <Text style={styles.productId} numberOfLines={1}>
          {productName}
        </Text>
        {isLow && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{sl.stock.lowStock}</Text>
          </View>
        )}
      </View>
      <Text style={styles.warehouse}>{sl.stock.warehouse}: {warehouseName}</Text>
      <Text style={styles.quantity}>{item.quantity}</Text>
      <Text style={styles.quantityLabel}>
        {sl.stock.quantity}
        {item.minQuantity != null && ` · min ${item.minQuantity}`}
        {item.maxQuantity != null && ` · max ${item.maxQuantity}`}
      </Text>
      {canWrite && (
        <TouchableOpacity style={styles.cardAction} onPress={onEditThresholds}>
          <Text style={styles.cardActionText}>{sl.stock.editThresholds}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EditThresholdsModal({
  item, productName, warehouseName, submitting, onCancel, onSubmit,
}: {
  item: InventoryResponse;
  productName: string;
  warehouseName: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (minQuantity: number | null, maxQuantity: number | null) => void;
}): React.ReactElement {
  const [min, setMin] = useState(item.minQuantity == null ? '' : String(item.minQuantity));
  const [max, setMax] = useState(item.maxQuantity == null ? '' : String(item.maxQuantity));
  const minNum = min.trim() ? parseInt(min, 10) : null;
  const maxNum = max.trim() ? parseInt(max, 10) : null;
  const valid  = (minNum === null || minNum >= 0)
              && (maxNum === null || maxNum >= 0)
              && (minNum === null || maxNum === null || maxNum >= minNum);

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{sl.stock.editThresholds}</Text>
          <Text style={styles.modalMeta} numberOfLines={2}>
            {productName} · {warehouseName} · {sl.stock.quantity}: {item.quantity}
          </Text>

          <View style={styles.thresholdsRow}>
            <View style={styles.thresholdCol}>
              <Text style={styles.label}>{sl.stock.minThreshold}</Text>
              <TextInput style={styles.input} value={min} onChangeText={setMin} keyboardType="number-pad" placeholder="—" />
            </View>
            <View style={styles.thresholdCol}>
              <Text style={styles.label}>{sl.stock.maxThreshold}</Text>
              <TextInput style={styles.input} value={max} onChangeText={setMax} keyboardType="number-pad" placeholder="—" />
            </View>
          </View>
          {!valid && <Text style={styles.thresholdWarn}>{sl.stock.thresholdInvalid}</Text>}
          <Text style={styles.modalHint}>{sl.stock.thresholdHint}</Text>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={submitting}>
              <Text style={styles.cancelBtnText}>{sl.common.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!valid || submitting) && styles.submitBtnDisabled]}
              onPress={() => onSubmit(minNum, maxNum)}
              disabled={!valid || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>{sl.common.save}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },
  filterRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  chip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive:     { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  chipText:       { fontSize: 12, color: '#64748b' },
  chipTextActive: { color: '#3b82f6', fontWeight: '600' },
  list:           { padding: 12, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyState:     { alignItems: 'center', gap: 12 },
  emptyIcon:      { fontSize: 48 },
  empty:          { color: '#94a3b8', fontSize: 14 },
  emptyHint:      { marginTop: 4, color: '#64748b', fontSize: 12, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  card:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardLow:        { borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  productId:      { fontSize: 13, color: '#475569', flex: 1 },
  badge:          { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText:      { fontSize: 10, color: '#dc2626', fontWeight: '600' },
  warehouse:      { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  quantity:       { fontSize: 32, fontWeight: '800', color: '#1e293b' },
  quantityLabel:  { fontSize: 11, color: '#94a3b8' },
  cardAction:     { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#dbeafe' },
  cardActionText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  consumeFab:     { position: 'absolute', bottom: 24, right: 24, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  consumeFabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Modal
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard:      { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 8 },
  modalTitle:     { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  modalMeta:      { fontSize: 12, color: '#64748b' },
  modalHint:      { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  thresholdsRow:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  thresholdCol:   { flex: 1 },
  label:          { fontSize: 12, color: '#475569', marginBottom: 4, fontWeight: '600' },
  input:          { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#1e293b', backgroundColor: '#f9fafb' },
  thresholdWarn:  { color: '#b45309', fontSize: 11 },
  modalActions:   { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn:      { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:  { color: '#374151', fontSize: 14, fontWeight: '600' },
  submitBtn:      { flex: 1, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});
