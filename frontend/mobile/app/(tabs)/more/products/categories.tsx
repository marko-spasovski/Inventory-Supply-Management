import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { productsApi } from '@/lib/api/products';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import { useHasFeature } from '@/hooks/useHasFeature';
import { formatApiError } from '@/lib/http/errors';
import type { CategoryResponse } from '@erp/api-types';

export default function CategoriesScreen(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const canWrite    = useHasFeature('CATEGORIES_WRITE');
  const [editing,   setEditing]   = useState<CategoryResponse | 'new' | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.categories,
    queryFn:  productsApi.getAllCategories,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.categories });

  const saveMutation = useMutation({
    mutationFn: (body: { id: string | null; name: string; description: string | undefined }) =>
      body.id
        ? productsApi.updateCategory(body.id, { name: body.name, description: body.description })
        : productsApi.createCategory({ name: body.name, description: body.description }),
    onSuccess: () => { invalidate(); setEditing(null); },
    onError:   (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteCategory(id),
    onSuccess: invalidate,
    onError:   (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  const confirmDelete = (c: CategoryResponse) => {
    Alert.alert(sl.categories.deleteConfirm, c.name, [
      { text: sl.common.cancel, style: 'cancel' },
      { text: sl.common.delete, style: 'destructive', onPress: () => deleteMutation.mutate(c.id) },
    ]);
  };

  if (isLoading) return <LoadingView />;
  if (isError)   return <ErrorView onRetry={refetch} />;

  const items = data ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.categories.title}</Text>
        <RoleGate feature="CATEGORIES_WRITE">
          <TouchableOpacity onPress={() => setEditing('new')}>
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
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.empty}>{sl.categories.noItems}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            </View>
            {canWrite && (
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(item)}>
                  <Text style={styles.editBtnText}>{sl.common.edit}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(item)}>
                  <Text style={styles.delBtnText}>{sl.common.delete}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      {editing && (
        <CategoryFormModal
          initial={editing === 'new' ? null : editing}
          submitting={saveMutation.isPending}
          onCancel={() => setEditing(null)}
          onSubmit={(values) => saveMutation.mutate({
            id:          editing === 'new' ? null : editing.id,
            name:        values.name,
            description: values.description || undefined,
          })}
        />
      )}
    </SafeAreaView>
  );
}

function CategoryFormModal({
  initial, submitting, onCancel, onSubmit,
}: {
  initial: CategoryResponse | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string; description: string }) => void;
}): React.ReactElement {
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.modalTitle}>{initial ? sl.categories.editCategory : sl.categories.newCategory}</Text>

          <Text style={styles.label}>{sl.categories.name}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} autoCapitalize="sentences" />

          <Text style={styles.label}>{sl.categories.description}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={3}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={submitting}>
              <Text style={styles.cancelBtnText}>{sl.common.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => onSubmit({ name: name.trim(), description: desc.trim() })}
              disabled={!canSubmit}
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
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back:           { color: '#3b82f6', fontSize: 15 },
  title:          { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  add:            { color: '#3b82f6', fontSize: 22, fontWeight: '300' },
  list:           { padding: 12, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyState:     { alignItems: 'center', gap: 12 },
  emptyIcon:      { fontSize: 48 },
  empty:          { color: '#94a3b8' },
  row:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, gap: 8, elevation: 1 },
  name:           { fontWeight: '700', color: '#1e293b', fontSize: 14 },
  desc:           { color: '#64748b', fontSize: 12, marginTop: 4 },
  rowActions:     { flexDirection: 'row', gap: 6 },
  editBtn:        { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#dbeafe' },
  editBtnText:    { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  delBtn:         { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  delBtnText:     { color: '#dc2626', fontSize: 12, fontWeight: '600' },
  // Modal
  backdrop:       { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:           { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 14, padding: 18 },
  modalTitle:     { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  label:          { fontSize: 12, color: '#475569', marginBottom: 4, marginTop: 8, fontWeight: '600' },
  input:          { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#1e293b', backgroundColor: '#f9fafb' },
  textarea:       { minHeight: 70, textAlignVertical: 'top' },
  actions:        { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn:      { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:  { color: '#374151', fontSize: 14, fontWeight: '600' },
  submitBtn:      { flex: 1, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});
