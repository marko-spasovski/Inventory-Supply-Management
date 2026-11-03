import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { sl } from '@/constants/i18n';
import type { VehicleResponse } from '@erp/api-types';

export interface VehicleFormValues {
  registrationPlate: string;
}

interface Props {
  initial?: VehicleResponse;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: VehicleFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

export function VehicleForm({ initial, submitting, submitError, onSubmit, onCancel, submitLabel }: Props): React.ReactElement {
  const [registrationPlate, setRegistrationPlate] = useState(initial?.registrationPlate ?? '');

  const canSubmit = registrationPlate.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>{sl.fleet.plateNumber}</Text>
      <TextInput
        style={styles.input}
        value={registrationPlate}
        onChangeText={setRegistrationPlate}
        autoCapitalize="characters"
        autoCorrect={false}
      />

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
          onPress={() => onSubmit({ registrationPlate: registrationPlate.trim() })}
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
  submitError:      { padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 },
  submitErrorText:  { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  actionRow:        { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:    { color: '#374151', fontSize: 15, fontWeight: '600' },
  submitBtn:        { flex: 1, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
