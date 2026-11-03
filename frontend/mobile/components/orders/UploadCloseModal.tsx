// Picks a PDF, uploads it via ordersApi.uploadDocument, then advances the
// order status to Closed. Mirrors the web orders-mf 'Upload & Close' flow.
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { queryKeys, ORDER_STATUS_VALUES } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { formatApiError } from '@/lib/http/errors';

interface PickedFile {
  uri:       string;
  name:      string;
  mimeType?: string | null;
  size?:     number | null;
}

interface Props {
  orderId: string;
  onClose: () => void;       // dismiss without closing the order
  onClosed?: () => void;     // called after successful upload + status->Closed
}

export function UploadCloseModal({ orderId, onClose, onClosed }: Props): React.ReactElement {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<PickedFile | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(sl.orders.document);
      await ordersApi.uploadDocument(orderId, { uri: file.uri, name: file.name, mimeType: file.mimeType ?? null });
      await ordersApi.updateStatus(orderId, ORDER_STATUS_VALUES.Closed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(orderId) });
      onClosed?.();
      onClose();
    },
    onError: (err) => Alert.alert(sl.common.error, formatApiError(err)),
  });

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    const a = result.assets[0];
    if (!a) return;
    // The backend's DocumentStorageService rejects empty files.
    if (a.size === 0) {
      Alert.alert(sl.common.error, sl.orders.emptyFile);
      return;
    }
    const looksPdf = (a.mimeType ?? '').includes('pdf') || a.name.toLowerCase().endsWith('.pdf');
    if (!looksPdf) {
      Alert.alert(sl.common.error, sl.orders.onlyPdf);
      return;
    }
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? null, size: a.size ?? null });
  };

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{sl.orders.closeOrder}</Text>
          <Text style={styles.intro}>{sl.orders.uploadHint}</Text>

          <Text style={styles.label}>{sl.orders.document}</Text>
          <TouchableOpacity style={styles.pickBtn} onPress={pick} disabled={mutation.isPending}>
            <Text style={styles.pickBtnText} numberOfLines={1}>
              {file ? `📎 ${file.name}` : '📎 PDF…'}
            </Text>
          </TouchableOpacity>
          {file?.size != null && (
            <Text style={styles.meta}>{(file.size / 1024).toFixed(1)} KB</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={mutation.isPending}>
              <Text style={styles.cancelBtnText}>{sl.common.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!file || mutation.isPending) && styles.submitBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!file || mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>{sl.orders.uploadAndClose}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:        { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 8 },
  title:       { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  intro:       { fontSize: 12, color: '#64748b', lineHeight: 18 },
  label:       { fontSize: 12, color: '#475569', marginTop: 10, marginBottom: 4, fontWeight: '600' },
  pickBtn:     { borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', backgroundColor: '#f8fafc' },
  pickBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
  meta:        { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  actions:     { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn:        { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:    { color: '#374151', fontSize: 14, fontWeight: '600' },
  submitBtn:        { flex: 1, backgroundColor: '#6d28d9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});
