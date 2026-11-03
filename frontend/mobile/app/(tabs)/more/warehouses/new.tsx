import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '@/lib/api/warehouses';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { formatApiError } from '@/lib/http/errors';
import { WarehouseForm, type WarehouseFormValues } from '@/components/forms/WarehouseForm';

export default function NewWarehouseScreen(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: WarehouseFormValues) => warehousesApi.create({
      name:          values.name,
      country:       values.country,
      city:          values.city,
      totalCapacity: values.totalCapacity,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses });
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouseSummary });
      router.back();
    },
    onError: (err) => setSubmitError(formatApiError(err)),
  });

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>{sl.common.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.warehouses.newWarehouse}</Text>
        <View style={{ width: 60 }} />
      </View>
      <WarehouseForm
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
  title:     { fontSize: 16, fontWeight: '700', color: '#1e293b' },
});
