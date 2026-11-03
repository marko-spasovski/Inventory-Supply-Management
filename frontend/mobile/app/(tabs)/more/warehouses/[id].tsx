import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '@/lib/api/warehouses';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import { formatApiError } from '@/lib/http/errors';

export default function WarehouseDetailScreen(): React.ReactElement {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.warehouseDetail(id!),
    queryFn:  () => warehousesApi.getById(id!),
    enabled:  !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => warehousesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses });
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouseSummary });
      router.back();
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const pct = data.totalCapacity > 0 ? data.usedCapacity / data.totalCapacity : 0;
  const barColor = pct > 0.9 ? '#dc2626' : pct > 0.7 ? '#f59e0b' : '#10b981';

  const confirmDelete = () => {
    Alert.alert(
      sl.common.delete,
      `${data.name}?`,
      [
        { text: sl.common.cancel, style: 'cancel' },
        { text: sl.common.delete, style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{data.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Field label={sl.warehouses.name} value={data.name} />
        <Field label={sl.warehouses.country} value={data.country} />
        <Field label={sl.warehouses.city} value={data.city} />

        <View style={styles.capacityCard}>
          <Text style={styles.fieldLabel}>{sl.warehouses.capacity}</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: barColor }]} />
          </View>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityText}>
              {data.usedCapacity} / {data.totalCapacity}  ({Math.round(pct * 100)}%)
            </Text>
            <Text style={styles.capacityFree}>
              {sl.warehouses.available}: {Math.max(data.totalCapacity - data.usedCapacity, 0)}
            </Text>
          </View>
        </View>

        <RoleGate feature="WAREHOUSES_WRITE">
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/(tabs)/more/warehouses/edit/[id]', params: { id: data.id } })}
            >
              <Text style={styles.editBtnText}>{sl.common.edit}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, deleteMutation.isPending && styles.btnDisabled]}
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              <Text style={styles.deleteBtnText}>{sl.common.delete}</Text>
            </TouchableOpacity>
          </View>
        </RoleGate>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerBtn:      { color: '#3b82f6', fontSize: 15 },
  title:          { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'center' },
  content:        { padding: 16, gap: 4 },
  field:          { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8 },
  fieldLabel:     { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  fieldValue:     { fontSize: 15, color: '#1e293b' },
  capacityCard:   { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8 },
  barBg:          { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginVertical: 8 },
  barFill:        { height: 8, borderRadius: 4 },
  capacityRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capacityText:   { fontSize: 13, color: '#1e293b', fontWeight: '600' },
  capacityFree:   { fontSize: 12, color: '#64748b' },
  actionRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  editBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center' },
  editBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn:      { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center' },
  deleteBtnText:  { color: '#b91c1c', fontWeight: '700', fontSize: 15 },
  btnDisabled:    { opacity: 0.5 },
});
