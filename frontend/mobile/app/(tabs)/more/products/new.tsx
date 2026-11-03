import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/products';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { formatApiError } from '@/lib/http/errors';
import { LoadingView } from '@/components/ui/LoadingView';
import { ProductForm, type ProductFormValues } from '@/components/forms/ProductForm';
import type { ProductResponse } from '@erp/api-types';

const str = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default function NewProductScreen(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Optional pre-fill, e.g. when arriving from a scanned product QR code.
  const params      = useLocalSearchParams();
  const prefillName = str(params.name);
  const prefillSku  = str(params.sku);
  const prefillDesc = str(params.description);
  const prefillWeight   = str(params.weight);
  const prefillCategory = str(params.category);
  const hasPrefill  = !!(prefillName || prefillSku);

  // Resolve the category NAME from the QR to a category id. Only block on the
  // categories load when a category name was supplied to resolve.
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: queryKeys.categories,
    queryFn:  productsApi.getAllCategories,
    enabled:  hasPrefill && !!prefillCategory,
  });

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => productsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      router.back();
    },
    onError: (err) => setSubmitError(formatApiError(err)),
  });

  if (hasPrefill && prefillCategory && categoriesLoading) {
    return <LoadingView />;
  }

  const resolvedCategoryId = prefillCategory
    ? categories?.find((c) => c.name.trim().toLowerCase() === prefillCategory.trim().toLowerCase())?.id ?? ''
    : '';

  const initial: ProductResponse | undefined = hasPrefill
    ? {
        id:          '',
        name:        prefillName ?? '',
        sku:         prefillSku ?? '',
        description: prefillDesc ?? '',
        weight:      prefillWeight ? Number(prefillWeight) : 0,
        categoryId:  resolvedCategoryId,
      }
    : undefined;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>{sl.common.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.products.newProduct}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ProductForm
        initial={initial}
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
