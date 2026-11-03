import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/products';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import type { CategoryResponse, ProductResponse } from '@erp/api-types';

export interface ProductFormValues {
  name:        string;
  sku:         string;
  description: string;
  weight:      number;
  categoryId:  string;
}

// Capitalize the first letter, leaving the rest untouched.
const capitalizeFirst = (v: string) => v ? v.charAt(0).toUpperCase() + v.slice(1) : v;

interface Props {
  initial?: ProductResponse;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

export function ProductForm({ initial, submitting, submitError, onSubmit, onCancel, submitLabel }: Props): React.ReactElement {
  const [name,        setName]        = useState(initial?.name ?? '');
  const [sku,         setSku]         = useState(initial?.sku ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [weight,      setWeight]      = useState(initial?.weight !== undefined ? String(initial.weight) : '');
  const [categoryId,  setCategoryId]  = useState(initial?.categoryId ?? '');

  const { data: categories } = useQuery({ queryKey: queryKeys.categories, queryFn: productsApi.getAllCategories });

  const weightNum = parseFloat(weight);
  const canSubmit =
    name.trim().length > 0 &&
    sku.trim().length > 0 &&
    !Number.isNaN(weightNum) && weightNum >= 0 &&
    categoryId.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>{sl.products.name}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>{sl.products.sku}</Text>
      <TextInput style={styles.input} value={sku} onChangeText={setSku} autoCapitalize="characters" autoCorrect={false} />

      <Text style={styles.label}>{sl.products.description}</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>{sl.products.weight}</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <Text style={styles.label}>{sl.products.category}</Text>
      <View style={styles.pickerList}>
        {(categories ?? []).map((c: CategoryResponse) => {
          const active = c.id === categoryId;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.pickerItem, active && styles.pickerItemActive]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={[styles.pickerText, active && styles.pickerTextActive]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        {(categories ?? []).length === 0 && (
          <Text style={styles.pickerEmpty}>{sl.categories.noItems}</Text>
        )}
      </View>

      {submitError && (
        <View style={styles.submitError} accessibilityRole="alert">
          <Text style={styles.submitErrorText}>{submitError}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={submitting}>
          <Text style={styles.cancelBtnText}>{sl.common.cancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          disabled={!canSubmit || submitting}
          onPress={() => onSubmit({ name: capitalizeFirst(name.trim()), sku: capitalizeFirst(sku.trim()), description: capitalizeFirst(description.trim()), weight: weightNum, categoryId })}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>{submitLabel}</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content:          { padding: 16 },
  label:            { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input:            { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff', marginBottom: 12 },
  textarea:         { minHeight: 80, textAlignVertical: 'top' },
  pickerList:       { gap: 4, marginBottom: 12 },
  pickerItem:       { padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  pickerItemActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  pickerText:       { fontSize: 13, color: '#374151' },
  pickerTextActive: { color: '#3b82f6', fontWeight: '600' },
  pickerEmpty:      { color: '#94a3b8', fontSize: 12, padding: 12 },
  submitError:      { padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 },
  submitErrorText:  { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  actionRow:        { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:    { color: '#374151', fontSize: 15, fontWeight: '600' },
  submitBtn:        { flex: 1, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
