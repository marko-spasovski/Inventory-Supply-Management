import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fleetApi } from '@/lib/api/fleet';
import { companiesApi } from '@/lib/api/companies';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import type { DriverResponse } from '@erp/api-types';

export interface DriverFormValues {
  name:      string;
  phone:     string;
  email:     string;
  vehicleId: string;
  companyId: string;
}

interface Props {
  initial?: DriverResponse;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: DriverFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

export function DriverForm({ initial, submitting, submitError, onSubmit, onCancel, submitLabel }: Props): React.ReactElement {
  const [name,      setName]      = useState(initial?.name ?? '');
  const [phone,     setPhone]     = useState(initial?.phone ?? '');
  const [email,     setEmail]     = useState(initial?.email ?? '');
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? '');
  const [companyId, setCompanyId] = useState(initial?.companyId ?? '');

  const { data: vehicles }  = useQuery({ queryKey: queryKeys.vehicles,  queryFn: fleetApi.getAllVehicles });
  const { data: companies } = useQuery({ queryKey: queryKeys.companies, queryFn: companiesApi.getAll });

  const canSubmit =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    vehicleId.length > 0 &&
    companyId.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>{sl.fleet.name}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>{sl.fleet.phone}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.label}>{sl.fleet.email}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>{sl.fleet.vehicle}</Text>
      <Picker
        items={(vehicles ?? []).map((v) => ({ id: v.id, label: v.registrationPlate }))}
        selected={vehicleId}
        onSelect={setVehicleId}
        emptyText={sl.fleet.noVehicles}
      />

      <Text style={styles.label}>{sl.fleet.company}</Text>
      <Picker
        items={(companies ?? []).map((c) => ({ id: c.id, label: c.name }))}
        selected={companyId}
        onSelect={setCompanyId}
        emptyText={sl.companies.noItems}
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
          onPress={() => onSubmit({
            name:      name.trim(),
            phone:     phone.trim(),
            email:     email.trim(),
            vehicleId,
            companyId,
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

function Picker({ items, selected, onSelect, emptyText }: { items: { id: string; label: string }[]; selected: string; onSelect: (id: string) => void; emptyText?: string }): React.ReactElement {
  if (items.length === 0 && emptyText) {
    return <Text style={styles.pickerEmpty}>{emptyText}</Text>;
  }
  return (
    <View style={styles.pickerList}>
      {items.map((item) => {
        const active = item.id === selected;
        return (
          <TouchableOpacity
            key={item.id || '__none__'}
            style={[styles.pickerItem, active && styles.pickerItemActive]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={[styles.pickerText, active && styles.pickerTextActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
  pickerEmpty:      { color: '#94a3b8', fontSize: 12, padding: 12, marginBottom: 12 },
  submitError:      { padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 },
  submitErrorText:  { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  actionRow:        { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:    { color: '#374151', fontSize: 15, fontWeight: '600' },
  submitBtn:        { flex: 1, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
