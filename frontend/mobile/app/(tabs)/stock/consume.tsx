// Stock consume / issue — reduce inventory with a consumption record.
//
// Behavioral parity with web inventory-mf's Consume Stock flow, with one
// frontend-only difference: web auto-generates the consumption-record PDF
// via jspdf and sends it as `document`; React Native has no Blob/jspdf
// pipeline, so mobile asks the user to attach a PDF themselves (signed
// delivery sheet, paper form scan, …) which is sent as `document`. The
// optional `proof` field is preserved verbatim. No backend changes.
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { inventoryApi } from '@/lib/api/inventory';
import { warehousesApi } from '@/lib/api/warehouses';
import { productsApi } from '@/lib/api/products';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { formatApiError } from '@/lib/http/errors';
import { showToast } from '@/stores/toastStore';
import type { InventoryResponse } from '@erp/api-types';

interface PickedFile {
  uri:       string;
  name:      string;
  mimeType?: string | null;
  size?:     number | null;
}

export default function ConsumeStockScreen(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();

  // Map of inventory row id -> quantity to consume.
  const [qtyByInventoryId, setQtyByInventoryId] = useState<Record<string, string>>({});
  const [purpose,     setPurpose]      = useState('');
  const [dateOfUsage, setDateOfUsage]  = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription]  = useState('');
  const [document,    setDocument]     = useState<PickedFile | null>(null);
  const [proof,       setProof]        = useState<PickedFile | null>(null);

  const { data: stock, isLoading: sLoading, isError: sError, refetch } = useQuery({
    queryKey: queryKeys.stockAll,
    queryFn:  inventoryApi.getAll,
  });
  const { data: products }   = useQuery({ queryKey: queryKeys.products,   queryFn: productsApi.getAll });
  const { data: warehouses } = useQuery({ queryKey: queryKeys.warehouses, queryFn: warehousesApi.getAll });

  const productMap = useMemo(() => {
    const m: Record<string, string> = {};
    products?.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [products]);
  const warehouseMap = useMemo(() => {
    const m: Record<string, string> = {};
    warehouses?.forEach((w) => { m[w.id] = w.name; });
    return m;
  }, [warehouses]);

  const selectedItems = useMemo(() => {
    if (!stock) return [] as { row: InventoryResponse; qty: number }[];
    return stock
      .map((row) => {
        const raw = qtyByInventoryId[row.id];
        const qty = raw ? parseInt(raw, 10) : 0;
        return { row, qty };
      })
      .filter((x) => x.qty > 0);
  }, [stock, qtyByInventoryId]);

  const overQty = selectedItems.find((x) => x.qty > x.row.quantity);
  const ready =
    selectedItems.length > 0 &&
    !overQty &&
    purpose.trim().length > 0 &&
    dateOfUsage.trim().length > 0 &&
    !!document;

  const pickPdf = async (setter: (f: PickedFile | null) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    const a = result.assets[0];
    if (!a) return;
    if (a.size === 0) { Alert.alert(sl.common.error, sl.orders.emptyFile); return; }
    const looksPdf = (a.mimeType ?? '').includes('pdf') || a.name.toLowerCase().endsWith('.pdf');
    if (!looksPdf) { Alert.alert(sl.common.error, sl.stock.proofMustPdf); return; }
    setter({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? null, size: a.size ?? null });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!document) throw new Error(sl.orders.document);
      await inventoryApi.consume({
        items: selectedItems.map(({ row, qty }) => ({
          productId:   row.productId,
          warehouseId: row.warehouseId,
          quantity:    qty,
        })),
        purpose:     purpose.trim(),
        dateOfUsage: dateOfUsage.trim(),
        description: description.trim(),
        document,
        proof:       proof ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAll });
      showToast(sl.stock.consumeSaved, 'success');
      router.back();
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  if (sLoading) return <LoadingView />;
  if (sError)   return <ErrorView onRetry={refetch} />;

  const items = stock ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.stock.consumeTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>{sl.stock.consumeIntro}</Text>

        <Text style={styles.section}>{sl.stock.product}</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>{sl.stock.noItems}</Text>
        ) : (
          items.map((row) => {
            const productName   = productMap[row.productId]   ?? row.productId.slice(0, 8) + '…';
            const warehouseName = warehouseMap[row.warehouseId] ?? row.warehouseId.slice(0, 8) + '…';
            const raw = qtyByInventoryId[row.id] ?? '';
            const qty = raw ? parseInt(raw, 10) : 0;
            const over = qty > row.quantity;
            const empty = row.quantity <= 0;
            return (
              <View key={row.id} style={[styles.itemRow, empty && styles.itemRowDisabled]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{productName}</Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {warehouseName}  ·  {sl.stock.available_}: {row.quantity}
                  </Text>
                </View>
                <TextInput
                  style={[styles.qtyInput, over && styles.qtyInputError]}
                  value={raw}
                  onChangeText={(v) => setQtyByInventoryId((prev) => ({ ...prev, [row.id]: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="0"
                  editable={!empty}
                />
              </View>
            );
          })
        )}
        {overQty && (
          <Text style={styles.warn}>{sl.stock.consumeQtyMax}</Text>
        )}

        <Text style={styles.section}>{sl.stock.purpose}</Text>
        <TextInput
          style={styles.input}
          value={purpose}
          onChangeText={setPurpose}
        />

        <Text style={styles.section}>{sl.stock.dateOfUsage}</Text>
        <DatePickerField
          value={dateOfUsage}
          onChange={setDateOfUsage}
          placeholder={sl.common.selectPlaceholder}
          maximumDate={new Date()}
        />

        <Text style={styles.section}>{sl.stock.description}</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.section}>{sl.orders.document}</Text>
        <TouchableOpacity style={styles.pickBtn} onPress={() => pickPdf(setDocument)} disabled={mutation.isPending}>
          <Text style={styles.pickBtnText} numberOfLines={1}>
            {document ? `📎 ${document.name}` : '📎 PDF…'}
          </Text>
        </TouchableOpacity>
        {document?.size != null && <Text style={styles.fileMeta}>{(document.size / 1024).toFixed(1)} KB</Text>}

        <Text style={styles.section}>{sl.stock.proofDocument}</Text>
        <TouchableOpacity style={styles.pickBtn} onPress={() => pickPdf(setProof)} disabled={mutation.isPending}>
          <Text style={styles.pickBtnText} numberOfLines={1}>
            {proof ? `📎 ${proof.name}` : '📎 PDF…'}
          </Text>
        </TouchableOpacity>
        {proof?.size != null && <Text style={styles.fileMeta}>{(proof.size / 1024).toFixed(1)} KB</Text>}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={mutation.isPending}>
            <Text style={styles.cancelBtnText}>{sl.common.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, (!ready || mutation.isPending) && styles.submitBtnDisabled]}
            onPress={() => mutation.mutate()}
            disabled={!ready || mutation.isPending}
          >
            {mutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>{sl.stock.useStock}</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f1f5f9' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back:        { color: '#3b82f6', fontSize: 15 },
  title:       { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  content:     { padding: 16, paddingBottom: 32 },
  intro:       { fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 18 },
  section:     { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 14, marginBottom: 6 },
  empty:       { color: '#94a3b8', fontSize: 13 },
  itemRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, gap: 10 },
  itemRowDisabled: { opacity: 0.5 },
  itemName:    { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  itemMeta:    { fontSize: 11, color: '#64748b', marginTop: 2 },
  qtyInput:    { width: 70, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: '#1e293b', backgroundColor: '#f9fafb', textAlign: 'center' },
  qtyInputError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  warn:        { color: '#b45309', fontSize: 12, marginTop: 4 },
  input:       { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1e293b', backgroundColor: '#fff' },
  textarea:    { minHeight: 70, textAlignVertical: 'top' },
  pickBtn:     { borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', backgroundColor: '#fff' },
  pickBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
  fileMeta:    { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  actions:     { flexDirection: 'row', gap: 8, marginTop: 20 },
  cancelBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:    { color: '#374151', fontSize: 14, fontWeight: '600' },
  submitBtn:        { flex: 1, backgroundColor: '#6d28d9', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});
