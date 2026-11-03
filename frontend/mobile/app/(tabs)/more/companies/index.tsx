import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { companiesApi } from '@/lib/api/companies';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import type { CompanyResponse } from '@erp/api-types';

export default function CompaniesScreen(): React.ReactElement {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.companies,
    queryFn:  companiesApi.getAll,
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
        <Text style={styles.title}>{sl.companies.title}</Text>
        <RoleGate feature="COMPANIES_WRITE">
          <TouchableOpacity onPress={() => router.push('/(tabs)/more/companies/new')}>
            <Text style={styles.add}>＋</Text>
          </TouchableOpacity>
        </RoleGate>
      </View>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.empty}>{sl.companies.noItems}</Text>
            <RoleGate feature="COMPANIES_WRITE">
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/more/companies/new')}>
                <Text style={styles.emptyCtaText}>{sl.companies.newCompany}</Text>
              </TouchableOpacity>
            </RoleGate>
          </View>
        }
        renderItem={({ item }: { item: CompanyResponse }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/(tabs)/more/companies/[id]', params: { id: item.id } })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.id}>{item.id}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
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
  card:           { backgroundColor: '#fff', borderRadius: 10, padding: 14, elevation: 1 },
  name:           { fontWeight: '700', color: '#1e293b', fontSize: 14 },
  id:             { color: '#94a3b8', fontSize: 10, marginTop: 2 },
});
