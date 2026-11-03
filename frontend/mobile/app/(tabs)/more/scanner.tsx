// Barcode scanner.
// Resolves SKU client-side by fetching the product list (cached 5 min via React Query).
// When backend ships GET /products/by-sku (Gap 5), swap resolveScannedCode internals.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView } from 'expo-camera';
import { useBarcode } from '@/lib/scanner/useBarcode';
import { resolveScannedCode } from '@/lib/scanner/resolveScannedCode';
import { parseProductPayload, type ScannedProduct } from '@/lib/scanner/parseProductPayload';
import { productsApi } from '@/lib/api/products';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { formatApiError } from '@/lib/http/errors';
import { showToast } from '@/stores/toastStore';
import type { ProductResponse } from '@erp/api-types';

type LookupState =
  | { kind: 'idle' }
  | { kind: 'searching'; sku: string }
  | { kind: 'found'; product: ProductResponse }
  | { kind: 'notFound'; sku: string }
  | { kind: 'checking'; sku: string }
  | { kind: 'productExists'; sku: string; name: string }
  | { kind: 'categoryMissing'; product: ScannedProduct; category: string }
  | { kind: 'productReady'; product: ScannedProduct; categoryId: string }
  | { kind: 'saving' }
  | { kind: 'error'; sku: string; message: string };

export default function ScannerScreen(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [manualSku, setManualSku] = useState('');
  const [state, setState] = useState<LookupState>({ kind: 'idle' });

  const lookup = async (sku: string) => {
    setState({ kind: 'searching', sku });
    try {
      const product = await resolveScannedCode(queryClient, sku);
      setState(product ? { kind: 'found', product } : { kind: 'notFound', sku });
    } catch (err) {
      setState({ kind: 'error', sku, message: err instanceof Error ? err.message : 'Napaka' });
    }
  };

  // A QR encoding a product payload is validated (SKU not already taken,
  // category exists) and offered as an "Add product" action; anything else is
  // treated as a SKU to look up. We never navigate from inside the scan
  // callback — the user taps a button — so a single scan can't fan out into
  // multiple screen pushes.
  const handleScanned = async (data: string) => {
    const product = parseProductPayload(data);
    if (!product) { void lookup(data); return; }

    setState({ kind: 'checking', sku: product.sku });
    try {
      const existing = await productsApi.getBySku(product.sku);
      if (existing) {
        setState({ kind: 'productExists', sku: product.sku, name: existing.name });
        return;
      }
      if (!product.category) {
        setState({ kind: 'error', sku: product.sku, message: sl.scanner.noCategoryInQr });
        return;
      }
      const categories = await productsApi.getAllCategories();
      const match = categories.find(
        (c) => c.name.trim().toLowerCase() === product.category!.trim().toLowerCase(),
      );
      if (!match) {
        setState({ kind: 'categoryMissing', product, category: product.category });
        return;
      }
      setState({ kind: 'productReady', product, categoryId: match.id });
    } catch (err) {
      setState({ kind: 'error', sku: product.sku, message: formatApiError(err) });
    }
  };

  const { hasPermission, canAskPermission, requestPermission, scanned, handleScan, reset } =
    useBarcode((result) => { void handleScanned(result.data); });

  const resetAll = () => { setState({ kind: 'idle' }); setManualSku(''); reset(); };

  // Direct create — scan-to-save. The button on the productReady card calls
  // this; success shows a toast and resets the scanner for the next scan, no
  // navigation. Avoids the "extra back-press" UX that pushing a form caused.
  const createProductMutation = useMutation({
    mutationFn: (vars: { product: ScannedProduct; categoryId: string }) =>
      productsApi.create({
        name:        vars.product.name,
        sku:         vars.product.sku,
        // No description in the QR → fall back to the product name so the
        // backend always receives a non-empty value.
        description: vars.product.description?.trim() || vars.product.name,
        weight:      vars.product.weight ?? 0,
        categoryId:  vars.categoryId,
      }),
    onMutate: () => setState({ kind: 'saving' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      showToast(sl.scanner.productAdded, 'success');
      resetAll();
    },
    onError: (err) => setState({ kind: 'error', sku: '', message: formatApiError(err) }),
  });

  // Inline create-category from the categoryMissing card. On success we
  // pick up the new category id and transition straight to productReady, so
  // the user can tap "Dodaj produkt" once more without re-scanning.
  const createCategoryMutation = useMutation({
    mutationFn: (vars: { name: string; product: ScannedProduct }) =>
      // Mirror the name into description so the new category isn't created
      // with an empty/null field.
      productsApi.createCategory({ name: vars.name, description: vars.name }),
    onSuccess: async (created, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      // Old versions of product-service's POST /categories return Ok() with no
      // body, so `created` may be empty / id may be undefined or the zero-GUID
      // (00000000-0000-0000-0000-000000000000). Detect that and look the new
      // category up by name as a fallback. Otherwise the next mutation would
      // POST /products with a bad categoryId and the backend would reply
      // "category with id 00000000-…-000000000000 was not found".
      const isInvalidGuid = (id: string | undefined): boolean =>
        !id || /^0+(?:-0+){4}$/.test(id);
      let categoryId = created?.id ?? '';
      if (isInvalidGuid(categoryId)) {
        try {
          const cats = await productsApi.getAllCategories();
          const match = cats.find(
            (c) => c.name.trim().toLowerCase() === vars.name.trim().toLowerCase(),
          );
          if (match) categoryId = match.id;
        } catch {
          // fall through — surfaced below as a clean error message
        }
      }
      if (isInvalidGuid(categoryId)) {
        setState({ kind: 'error', sku: '', message: formatApiError(new Error('Failed to resolve new category id.')) });
        return;
      }
      showToast(sl.scanner.categoryCreated, 'success');
      setState({ kind: 'productReady', product: vars.product, categoryId });
    },
    onError: (err) =>
      setState({ kind: 'error', sku: '', message: formatApiError(err) }),
  });

  const handleManualSubmit = () => {
    const sku = manualSku.trim();
    if (!sku) return;
    void lookup(sku);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.scanner.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      {!hasPermission ? (
        <View style={styles.permBox}>
          <Text style={styles.permMsg}>{sl.scanner.permissionMsg}</Text>
          {canAskPermission && (
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>{sl.scanner.permissionBtn}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.cameraBox}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr'] }}
            onBarcodeScanned={scanned ? undefined : (result) =>
              handleScan({ type: result.type, data: result.data })
            }
          />
          {scanned && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetAll}>
              <Text style={styles.resetText}>{sl.scanner.scanAgain}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ResultPanel
        state={state}
        onOpen={(id) => router.push({ pathname: '/(tabs)/more/products/[id]', params: { id } })}
        onAdd={(product, categoryId) => createProductMutation.mutate({ product, categoryId })}
        onCreateCategory={(name, product) => createCategoryMutation.mutate({ name, product })}
        creatingCategory={createCategoryMutation.isPending}
        onDismiss={resetAll}
      />

      <View style={styles.manual}>
        <Text style={styles.manualLabel}>{sl.scanner.manualEntry}</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            value={manualSku}
            onChangeText={setManualSku}
            placeholder="SKU…"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualSubmit} disabled={state.kind === 'searching'}>
            <Text style={styles.manualBtnText}>{state.kind === 'searching' ? '…' : 'OK'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ResultPanel({ state, onOpen, onAdd, onCreateCategory, creatingCategory, onDismiss }: {
  state: LookupState;
  onOpen: (id: string) => void;
  onAdd: (product: ScannedProduct, categoryId: string) => void;
  onCreateCategory: (name: string, product: ScannedProduct) => void;
  creatingCategory: boolean;
  onDismiss: () => void;
}): React.ReactElement | null {
  if (state.kind === 'idle') return null;

  if (state.kind === 'searching' || state.kind === 'checking' || state.kind === 'saving') {
    return (
      <View style={styles.resultCard}>
        <ActivityIndicator color="#93c5fd" />
        <Text style={styles.resultMeta}>
          {state.kind === 'checking' ? sl.scanner.checking
            : state.kind === 'saving' ? sl.scanner.saving
            : `SKU: ${state.sku}`}
        </Text>
      </View>
    );
  }

  if (state.kind === 'productReady') {
    return (
      <View style={[styles.resultCard, styles.resultFound]}>
        <Text style={styles.resultTitle}>{state.product.name}</Text>
        <Text style={styles.resultMeta}>SKU: {state.product.sku}</Text>
        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.resultBtnPrimary} onPress={() => onAdd(state.product, state.categoryId)}>
            <Text style={styles.resultBtnPrimaryText}>{sl.scanner.addProduct}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resultBtnSecondary} onPress={onDismiss}>
            <Text style={styles.resultBtnSecondaryText}>{sl.common.cancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state.kind === 'productExists') {
    return (
      <View style={[styles.resultCard, styles.resultWarn]}>
        <Text style={styles.resultTitle}>{sl.scanner.productExists}</Text>
        <Text style={styles.resultMeta}>{state.name} · SKU: {state.sku}</Text>
        <TouchableOpacity style={styles.resultBtnSecondary} onPress={onDismiss}>
          <Text style={styles.resultBtnSecondaryText}>{sl.scanner.scanAgain}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state.kind === 'categoryMissing') {
    return (
      <View style={[styles.resultCard, styles.resultWarn]}>
        <Text style={styles.resultTitle}>{sl.scanner.categoryMissingTitle}</Text>
        <Text style={styles.resultMeta}>
          {sl.scanner.categoryMissingBody.replace('{category}', state.category)}
        </Text>
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={[styles.resultBtnPrimary, creatingCategory && styles.resultBtnDisabled]}
            disabled={creatingCategory}
            onPress={() => onCreateCategory(state.category, state.product)}
          >
            {creatingCategory
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.resultBtnPrimaryText}>{sl.scanner.createCategory}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.resultBtnSecondary} onPress={onDismiss}>
            <Text style={styles.resultBtnSecondaryText}>{sl.scanner.scanAgain}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state.kind === 'found') {
    return (
      <View style={[styles.resultCard, styles.resultFound]}>
        <Text style={styles.resultTitle}>{state.product.name}</Text>
        <Text style={styles.resultMeta}>SKU: {state.product.sku}  ·  {state.product.weight} kg</Text>
        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.resultBtnPrimary} onPress={() => onOpen(state.product.id)}>
            <Text style={styles.resultBtnPrimaryText}>{sl.scanner.openProduct}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resultBtnSecondary} onPress={onDismiss}>
            <Text style={styles.resultBtnSecondaryText}>{sl.common.cancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state.kind === 'notFound') {
    return (
      <View style={[styles.resultCard, styles.resultWarn]}>
        <Text style={styles.resultTitle}>{sl.scanner.notFound}</Text>
        <Text style={styles.resultMeta}>SKU: {state.sku}</Text>
        <TouchableOpacity style={styles.resultBtnSecondary} onPress={onDismiss}>
          <Text style={styles.resultBtnSecondaryText}>{sl.common.cancel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.resultCard, styles.resultError]}>
      <Text style={styles.resultTitle}>{sl.common.error}</Text>
      <Text style={styles.resultMeta}>{state.message}</Text>
      <TouchableOpacity style={styles.resultBtnSecondary} onPress={onDismiss}>
        <Text style={styles.resultBtnSecondaryText}>{sl.common.retry}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:                  { flex: 1, backgroundColor: '#0f172a' },
  header:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1e293b' },
  back:                  { color: '#93c5fd', fontSize: 15 },
  title:                 { fontSize: 16, fontWeight: '700', color: '#fff' },
  permBox:               { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permMsg:               { color: '#94a3b8', textAlign: 'center', marginBottom: 20, fontSize: 14 },
  permBtn:               { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  permBtnText:           { color: '#fff', fontWeight: '600' },
  cameraBox:             { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },
  camera:                { flex: 1 },
  resetBtn:              { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  resetText:             { color: '#fff', fontWeight: '600' },
  resultCard:            { margin: 16, marginTop: 0, backgroundColor: '#1e293b', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  resultFound:           { borderLeftColor: '#10b981' },
  resultWarn:            { borderLeftColor: '#f59e0b' },
  resultError:           { borderLeftColor: '#dc2626' },
  resultTitle:           { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  resultMeta:            { color: '#94a3b8', fontSize: 12, marginBottom: 10 },
  resultActions:         { flexDirection: 'row', gap: 8 },
  resultBtnPrimary:      { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  resultBtnPrimaryText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  resultBtnDisabled:     { opacity: 0.6 },
  resultBtnSecondary:    { flex: 1, borderWidth: 1, borderColor: '#334155', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  resultBtnSecondaryText:{ color: '#cbd5e1', fontWeight: '600', fontSize: 13 },
  manual:                { padding: 16, backgroundColor: '#1e293b' },
  manualLabel:           { color: '#94a3b8', fontSize: 12, marginBottom: 6 },
  manualRow:             { flexDirection: 'row', gap: 8 },
  manualInput:           { flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 10, color: '#fff', borderWidth: 1, borderColor: '#334155' },
  manualBtn:             { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  manualBtnText:         { color: '#fff', fontWeight: '700' },
});
