import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fleetApi } from '@/lib/api/fleet';
import { companiesApi } from '@/lib/api/companies';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import { formatApiError } from '@/lib/http/errors';

export default function DriverDetailScreen(): React.ReactElement {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.driverDetail(id!),
    queryFn:  () => fleetApi.getDriverById(id!),
    enabled:  !!id,
  });

  const { data: vehicles }  = useQuery({ queryKey: queryKeys.vehicles,  queryFn: fleetApi.getAllVehicles });
  const { data: companies } = useQuery({ queryKey: queryKeys.companies, queryFn: companiesApi.getAll });

  const deleteMutation = useMutation({
    mutationFn: () => fleetApi.deleteDriver(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers });
      router.back();
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  const vehicle = vehicles?.find((v) => v.id === data.vehicleId);
  const company = companies?.find((c) => c.id === data.companyId);

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
        <Field label={sl.fleet.name}    value={data.name} />
        <Field label={sl.fleet.phone}   value={data.phone || '—'} />
        <Field label={sl.fleet.email}   value={data.email || '—'} />
        <Field label={sl.fleet.vehicle} value={vehicle ? vehicle.registrationPlate : sl.fleet.none} />
        <Field label={sl.fleet.company} value={company?.name ?? '—'} />

        <RoleGate feature="FLEET_WRITE">
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/(tabs)/more/fleet/drivers/edit/[id]', params: { id: data.id } })}
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
  actionRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  editBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center' },
  editBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn:      { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center' },
  deleteBtnText:  { color: '#b91c1c', fontWeight: '700', fontSize: 15 },
  btnDisabled:    { opacity: 0.5 },
});
