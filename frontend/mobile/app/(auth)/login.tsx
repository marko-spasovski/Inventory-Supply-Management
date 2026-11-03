import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { formatApiError } from '@/lib/http/errors';
import { sl } from '@/constants/i18n';
import { useLocaleStore } from '@/lib/i18n/locale';
import { LOCALES, LOCALE_LABEL, type Locale } from '@erp/i18n';

const schema = z.object({
  email:    z.string().email('auth.emailInvalid'),
  password: z.string().min(1, 'auth.passwordRequired'),
});
type FormData = z.infer<typeof schema>;

// Validation messages are stored as i18n keys ("auth.emailInvalid") in the
// schema so the schema stays module-level; we resolve the key to the active
// locale's text at render time.
function msg(key: string | undefined): string | undefined {
  if (key === 'auth.emailInvalid')     return sl.auth.emailInvalid;
  if (key === 'auth.passwordRequired') return sl.auth.passwordRequired;
  return key;
}

export default function LoginScreen(): React.ReactElement {
  const router   = useRouter();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const locale    = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);
    try {
      const { response, token, refreshToken } = await authApi.login(data);
      setAuth(token, { id: response.id, email: response.email, name: response.name }, response.role, refreshToken);
      router.replace('/(tabs)');
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
      <View style={styles.card}>
        <View style={styles.localeRow}>
          {LOCALES.map((l: Locale) => {
            const active = l === locale;
            return (
              <TouchableOpacity
                key={l}
                onPress={() => setLocale(l)}
                accessibilityLabel={LOCALE_LABEL[l]}
                style={[styles.localeBtn, active && styles.localeBtnActive]}
              >
                <Text style={[styles.localeText, active && styles.localeTextActive]}>{l.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.title}>🚛 Pocket Logistics</Text>
        <Text style={styles.subtitle}>{sl.auth.login}</Text>

        <Text style={styles.label}>{sl.auth.email}</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ime@podjetje.si"
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{msg(errors.email.message)}</Text>}

        <Text style={styles.label}>{sl.auth.password}</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              autoCorrect={false}
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{msg(errors.password.message)}</Text>}

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
            : <Text style={styles.btnText}>{sl.auth.loginButton}</Text>
          }
        </TouchableOpacity>

        <Link href="/(auth)/register" style={styles.link}>
          {sl.auth.noAccount}
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center' },
  card:       { margin: 24, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title:      { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4, color: '#1e293b' },
  subtitle:   { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  label:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input:      { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f9fafb' },
  inputError: { borderColor: '#dc2626' },
  error:      { color: '#dc2626', fontSize: 12, marginTop: 2 },
  submitError:     { marginTop: 16, padding: 10, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  submitErrorText: { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  btn:        { marginTop: 20, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  link:       { marginTop: 16, textAlign: 'center', color: '#3b82f6', fontSize: 13 },
  localeRow:       { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: 8 },
  localeBtn:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#e2e8f0' },
  localeBtnActive: { backgroundColor: '#3b82f6' },
  localeText:      { fontSize: 12, fontWeight: '600', color: '#475569' },
  localeTextActive:{ color: '#fff', fontWeight: '700' },
});
