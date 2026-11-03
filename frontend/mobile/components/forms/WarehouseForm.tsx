import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { sl } from '@/constants/i18n';
import { COUNTRIES, CITIES } from '@/constants/warehouseOptions';
import { type Country, type City, type WarehouseResponse } from '@erp/api-types';

export interface WarehouseFormValues {
  name:          string;
  country:       Country;
  city:          City;
  totalCapacity: number;
  usedCapacity:  number;
}

interface Props {
  initial?: WarehouseResponse;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: WarehouseFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  // When editing, usedCapacity is preserved and the field is shown read-only.
  showUsedCapacity?: boolean;
}

// User-facing labels for the backend enum values (display only — the wire
// value is always the SCREAMING_CASE enum).
const COUNTRY_LABEL: Record<Country, string> = {
  SLOVENIA:  'Slovenija',
  MACEDONIA: 'Severna Makedonija',
};
const CITY_LABEL: Record<City, string> = {
  MARIBOR:   'Maribor',
  LJUBLJANA: 'Ljubljana',
  KUMANOVO:  'Kumanovo',
  SKOPJE:    'Skopje',
};

export function WarehouseForm({ initial, submitting, submitError, onSubmit, onCancel, submitLabel, showUsedCapacity = false }: Props): React.ReactElement {
  const [name,    setName]    = useState(initial?.name ?? '');
  const [country, setCountry] = useState<Country | ''>(initial?.country ?? '');
  const [city,    setCity]    = useState<City | ''>(initial?.city ?? '');
  const [totalCapacity, setTotalCapacity] = useState(initial?.totalCapacity !== undefined ? String(initial.totalCapacity) : '');

  const totalNum = parseInt(totalCapacity, 10);
  const usedNum  = initial?.usedCapacity ?? 0;
  const canSubmit =
    name.trim().length > 0 &&
    !!country &&
    !!city &&
    !Number.isNaN(totalNum) && totalNum >= 0 &&
    totalNum >= usedNum;

  const capacityWarning =
    !Number.isNaN(totalNum) && totalNum < usedNum
      ? `Kapaciteta ne sme biti manjša od že zasedene (${usedNum}).`
      : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>{sl.warehouses.name}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>{sl.warehouses.country}</Text>
      <View style={styles.pickerList}>
        {COUNTRIES.map((c) => {
          const active = c === country;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.pickerItem, active && styles.pickerItemActive]}
              onPress={() => setCountry(c)}
            >
              <Text style={[styles.pickerText, active && styles.pickerTextActive]}>{COUNTRY_LABEL[c]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>{sl.warehouses.city}</Text>
      <View style={styles.pickerList}>
        {CITIES.map((c) => {
          const active = c === city;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.pickerItem, active && styles.pickerItemActive]}
              onPress={() => setCity(c)}
            >
              <Text style={[styles.pickerText, active && styles.pickerTextActive]}>{CITY_LABEL[c]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>{sl.warehouses.capacity}</Text>
      <TextInput
        style={styles.input}
        value={totalCapacity}
        onChangeText={setTotalCapacity}
        keyboardType="number-pad"
        placeholder="0"
      />
      {capacityWarning && <Text style={styles.warning}>{capacityWarning}</Text>}

      {showUsedCapacity && (
        <>
          <Text style={styles.label}>{sl.warehouses.used}</Text>
          <View style={styles.readonly}><Text style={styles.readonlyText}>{usedNum}</Text></View>
        </>
      )}

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
          onPress={() => onSubmit({
            name:          name.trim(),
            country:       country as Country,
            city:          city as City,
            totalCapacity: totalNum,
            usedCapacity:  usedNum,
          })}
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
  pickerList:       { gap: 4, marginBottom: 12 },
  pickerItem:       { padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  pickerItemActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  pickerText:       { fontSize: 13, color: '#374151' },
  pickerTextActive: { color: '#3b82f6', fontWeight: '600' },
  readonly:         { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, backgroundColor: '#f9fafb', marginBottom: 12 },
  readonlyText:     { fontSize: 15, color: '#64748b' },
  warning:          { color: '#b45309', fontSize: 12, marginTop: -8, marginBottom: 12 },
  submitError:      { padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 },
  submitErrorText:  { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  actionRow:        { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:    { color: '#374151', fontSize: 15, fontWeight: '600' },
  submitBtn:        { flex: 1, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
