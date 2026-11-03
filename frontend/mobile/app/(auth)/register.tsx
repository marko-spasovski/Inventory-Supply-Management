import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '@/lib/api/auth';
import { formatApiError } from '@/lib/http/errors';
import { sl } from '@/constants/i18n';
import { showToast } from '@/stores/toastStore';

const ROLES = ['MANAGER', 'WORKER'] as const;

const schema = z.object({
  name:     z.string().min(1, 'auth.nameRequired'),
  email:    z.string().email('auth.emailInvalid'),
  password: z.string().min(6, 'auth.passwordMin'),
  role:     z.enum(ROLES),
});
type FormData = z.infer<typeof schema>;

// Validation messages are stored as i18n keys so the schema can stay
// module-level; resolve to the active locale's text at render time.
function msg(key: string | undefined): string | undefined {
  if (key === 'auth.nameRequired') return sl.auth.nameRequired;
  if (key === 'auth.emailInvalid') return sl.auth.emailInvalid;
  if (key === 'auth.passwordMin')  return sl.auth.passwordMin;
  return key;
}

export default function RegisterScreen(): React.ReactElement {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', role: 'WORKER' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);
    try {
      await authApi.register(data);
      showToast(sl.auth.accountCreated, 'success');
      router.replace('/(auth)/login');
    } catch (err) {
      setSubmitError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>🚛 Pocket Logistics</Text>
          <Text style={styles.subtitle}>{sl.auth.register}</Text>

          <Text style={styles.label}>{sl.auth.name}</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <TextInput style={[styles.input, errors.name && styles.inputError]}
                value={value} onChangeText={onChange} autoCapitalize="words" />
            )}
          />
          {errors.name && <Text style={styles.error}>{msg(errors.name.message)}</Text>}

          <Text style={styles.label}>{sl.auth.email}</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput style={[styles.input, errors.email && styles.inputError]}
                value={value} onChangeText={onChange}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            )}
          />
          {errors.email && <Text style={styles.error}>{msg(errors.email.message)}</Text>}

          <Text style={styles.label}>{sl.auth.password}</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput style={[styles.input, errors.password && styles.inputError]}
                value={value} onChangeText={onChange} secureTextEntry autoCorrect={false} />
            )}
          />
          {errors.password && <Text style={styles.error}>{msg(errors.password.message)}</Text>}

          <Text style={styles.label}>{sl.auth.role}</Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, value === r && styles.roleChipActive]}
                    onPress={() => onChange(r)}
                  >
                    <Text style={[styles.roleChipText, value === r && styles.roleChipTextActive]}>
                      {sl.roles[r]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />

          {submitError && (
            <View style={styles.submitError} accessibilityRole="alert">
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{sl.auth.registerButton}</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/login" style={styles.link}>
            {sl.auth.hasAccount}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#f1f5f9' },
  scroll:            { flexGrow: 1, justifyContent: 'center' },
  card:              { margin: 24, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title:             { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4, color: '#1e293b' },
  subtitle:          { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  label:             { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input:             { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f9fafb' },
  inputError:        { borderColor: '#dc2626' },
  error:             { color: '#dc2626', fontSize: 12, marginTop: 2 },
  submitError:       { marginTop: 16, padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  submitErrorText:   { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  roleRow:           { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleChip:          { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f9fafb' },
  roleChipActive:    { borderColor: '#3b82f6', backgroundColor: '#dbeafe' },
  roleChipText:      { fontSize: 13, color: '#374151' },
  roleChipTextActive:{ color: '#3b82f6', fontWeight: '600' },
  btn:               { marginTop: 20, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled:       { opacity: 0.6 },
  btnText:           { color: '#fff', fontWeight: '700', fontSize: 15 },
  link:              { marginTop: 16, textAlign: 'center', color: '#3b82f6', fontSize: 13 },
});
