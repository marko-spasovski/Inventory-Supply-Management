import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/companies';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import { formatApiError } from '@/lib/http/errors';

export default function CompanyDetailScreen(): React.ReactElement {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.companyDetail(id!),
    queryFn:  () => companiesApi.getById(id!),
    enabled:  !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => companiesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      router.back();
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <ErrorView onRetry={refetch} />;

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
        <Field label={sl.companies.name}    value={data.name} />
        <Field label={sl.companies.email}   value={data.email || '—'} />
        <Field label={sl.companies.phone}   value={data.phone || '—'} />
        <Field label={sl.companies.contact} value={data.contact || '—'} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ID</Text>
          <Text style={[styles.fieldValue, styles.mono]}>{data.id}</Text>
        </View>

        <RoleGate feature="COMPANIES_WRITE">
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/(tabs)/more/companies/edit/[id]', params: { id: data.id } })}
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
  mono:           { fontFamily: 'monospace', fontSize: 11, color: '#64748b' },
  actionRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  editBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center' },
  editBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn:      { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center' },
  deleteBtnText:  { color: '#b91c1c', fontWeight: '700', fontSize: 15 },
  btnDisabled:    { opacity: 0.5 },
});
