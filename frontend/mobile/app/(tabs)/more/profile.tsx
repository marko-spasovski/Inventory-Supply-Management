import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api/auth';
import { sl } from '@/constants/i18n';
import { useLocaleStore } from '@/lib/i18n/locale';
import { LOCALES, LOCALE_LABEL, type Locale } from '@erp/i18n';

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();
  const user      = useAuthStore((s) => s.user);
  const role      = useAuthStore((s) => s.role);
  const clear     = useAuthStore((s) => s.clear);
  const locale    = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const handleLogout = () => {
    Alert.alert(sl.auth.logout, sl.profile.confirmLogout, [
      { text: sl.common.cancel, style: 'cancel' },
      {
        text: sl.auth.logout,
        style: 'destructive',
        onPress: async () => {
          await authApi.logout();
          clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.profile.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{sl.roles[role]}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{sl.profile.language}</Text>
          <View style={styles.langRow}>
            {LOCALES.map((l: Locale) => {
              const active = l === locale;
              return (
                <TouchableOpacity
                  key={l}
                  style={[styles.langChip, active && styles.langChipActive]}
                  onPress={() => setLocale(l)}
                >
                  <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                    {LOCALE_LABEL[l]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{sl.auth.logout}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f1f5f9' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back:       { color: '#3b82f6', fontSize: 15 },
  title:      { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  content:    { padding: 24, alignItems: 'center', gap: 20 },
  card:       { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name:       { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  email:      { fontSize: 13, color: '#64748b', marginTop: 4 },
  roleBadge:  { marginTop: 10, backgroundColor: '#dbeafe', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleText:   { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
  logoutBtn:  { width: '100%', backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  section:    { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  langRow:    { flexDirection: 'row', gap: 8 },
  langChip:   { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', alignItems: 'center' },
  langChipActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  langChipText:   { fontSize: 13, color: '#475569' },
  langChipTextActive: { color: '#3b82f6', fontWeight: '700' },
});
