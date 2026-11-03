import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '@/lib/api/warehouses';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { formatApiError } from '@/lib/http/errors';
import { WarehouseForm, type WarehouseFormValues } from '@/components/forms/WarehouseForm';

export default function EditWarehouseScreen(): React.ReactElement {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.warehouseDetail(id!),
    queryFn:  () => warehousesApi.getById(id!),
    enabled:  !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: WarehouseFormValues) => warehousesApi.update(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses });
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouseDetail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouseSummary });
      router.back();
    },
    onError: (err) => setSubmitError(formatApiError(err)),
  });

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>{sl.common.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{data.name}</Text>
        <View style={{ width: 60 }} />
      </View>
      <WarehouseForm
        initial={data}
        showUsedCapacity
        submitting={mutation.isPending}
        submitError={submitError}
        onSubmit={(values) => { setSubmitError(null); mutation.mutate(values); }}
        onCancel={() => router.back()}
        submitLabel={sl.common.save}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f1f5f9' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerBtn: { color: '#3b82f6', fontSize: 15 },
  title:     { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'center' },
});
