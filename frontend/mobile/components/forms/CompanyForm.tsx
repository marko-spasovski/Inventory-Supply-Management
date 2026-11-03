import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { sl } from '@/constants/i18n';
import type { CompanyResponse } from '@erp/api-types';

export interface CompanyFormValues {
  name:    string;
  email:   string;
  phone:   string;
  contact: string;
}

interface Props {
  initial?: CompanyResponse;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: CompanyFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

export function CompanyForm({ initial, submitting, submitError, onSubmit, onCancel, submitLabel }: Props): React.ReactElement {
  const [name,    setName]    = useState(initial?.name ?? '');
  const [email,   setEmail]   = useState(initial?.email ?? '');
  const [phone,   setPhone]   = useState(initial?.phone ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');

  const canSubmit =
    name.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    phone.trim().length > 0 &&
    contact.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>{sl.companies.name}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>{sl.companies.email}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>{sl.companies.phone}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.label}>{sl.companies.contact}</Text>
      <TextInput style={styles.input} value={contact} onChangeText={setContact} autoCapitalize="words" />

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
            name:    name.trim(),
            email:   email.trim(),
            phone:   phone.trim(),
            contact: contact.trim(),
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
  submitError:      { padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 },
  submitErrorText:  { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  actionRow:        { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn:        { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText:    { color: '#374151', fontSize: 15, fontWeight: '600' },
  submitBtn:        { flex: 1, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
