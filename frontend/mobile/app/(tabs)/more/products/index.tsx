import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import type { ProductResponse } from '@erp/api-types';

export default function ProductsScreen(): React.ReactElement {
  const router = useRouter();
  const [skuQuery, setSkuQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.products,
    queryFn:  productsApi.getAll,
  });
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn:  productsApi.getAllCategories,
  });

  if (isLoading) return <LoadingView />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const all = data ?? [];
  const trimmedSku = skuQuery.trim().toLowerCase();
  const items = useMemo(() => {
    let list = all;
    if (categoryFilter) list = list.filter((p) => p.categoryId === categoryFilter);
    if (trimmedSku)     list = list.filter((p) => p.sku.toLowerCase().includes(trimmedSku));
    return list;
  }, [all, categoryFilter, trimmedSku]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.products.title}</Text>
        <RoleGate feature="PRODUCTS_WRITE">
          <TouchableOpacity onPress={() => router.push('/(tabs)/more/products/new')}>
            <Text style={styles.add}>＋</Text>
          </TouchableOpacity>
        </RoleGate>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { flex: 1 }]}
            value={skuQuery}
            onChangeText={setSkuQuery}
            placeholder={sl.products.skuPlaceholder}
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => router.push('/(tabs)/more/products/categories')}
          >
            <Text style={styles.manageBtnText}>{sl.categories.title}</Text>
          </TouchableOpacity>
        </View>
        {!!categories && categories.length > 0 && (
          <FlatList
            data={[{ id: '__all__', name: sl.products.allCategories }, ...categories.map((c) => ({ id: c.id, name: c.name }))]}
            keyExtractor={(c) => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            renderItem={({ item: c }) => {
              const active = c.id === '__all__' ? !categoryFilter : c.id === categoryFilter;
              return (
                <TouchableOpacity
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoryFilter(c.id === '__all__' ? null : c.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.empty}>{sl.products.noItems}</Text>
            <RoleGate feature="PRODUCTS_WRITE">
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/more/products/new')}>
                <Text style={styles.emptyCtaText}>{sl.products.newProduct}</Text>
              </TouchableOpacity>
            </RoleGate>
          </View>
        }
        renderItem={({ item }) => (
          <ProductRow item={item} onPress={() => router.push({ pathname: '/(tabs)/more/products/[id]', params: { id: item.id } })} />
        )}
      />
    </SafeAreaView>
  );
}

function ProductRow({ item, onPress }: { item: ProductResponse; onPress: () => void }): React.ReactElement {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.sku}>{sl.products.sku}: {item.sku}</Text>
      <Text style={styles.meta}>{item.weight} kg  ·  {item.description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back:           { color: '#3b82f6', fontSize: 15 },
  title:          { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  add:            { color: '#3b82f6', fontSize: 22, fontWeight: '300' },
  filterBar:      { backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 8 },
  searchRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput:    { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1e293b', backgroundColor: '#f9fafb' },
  manageBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#dbeafe' },
  manageBtnText:  { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  chipRow:        { gap: 6, paddingVertical: 2 },
  chip:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', maxWidth: 180 },
  chipActive:     { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  chipText:       { fontSize: 12, color: '#64748b' },
  chipTextActive: { color: '#3b82f6', fontWeight: '600' },
  list:           { padding: 12, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyState:     { alignItems: 'center', gap: 12 },
  emptyIcon:      { fontSize: 48 },
  empty:          { color: '#94a3b8' },
  emptyCta:       { marginTop: 4, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyCtaText:   { color: '#fff', fontWeight: '600', fontSize: 13 },
  card:           { backgroundColor: '#fff', borderRadius: 10, padding: 14, elevation: 1 },
  name:           { fontWeight: '700', color: '#1e293b', fontSize: 14 },
  sku:            { color: '#3b82f6', fontSize: 12, marginTop: 2 },
  meta:           { color: '#64748b', fontSize: 12, marginTop: 4 },
});
