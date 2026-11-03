import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { warehousesApi } from '@/lib/api/warehouses';
import { ordersApi } from '@/lib/api/orders';
import { notificationsApi } from '@/lib/api/notifications';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { useLocaleStore } from '@/lib/i18n/locale';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuthStore } from '@/stores/authStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function KpiCard({
  label, value, icon, color, onPress,
}: {
  label: string;
  value: string | number;
  icon: IoniconName;
  color: string;
  onPress?: () => void;
}): React.ReactElement {
  return (
    <TouchableOpacity
      style={styles.kpiCard}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: color + '1a' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen(): React.ReactElement {
  const user   = useAuthStore((s) => s.user);
  const role   = useAuthStore((s) => s.role);
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  const { data: warehouses, isLoading: wLoading, refetch: rWh } = useQuery({
    queryKey: queryKeys.warehouses,
    queryFn:  warehousesApi.getAll,
  });

  const { data: orders, isLoading: oLoading, refetch: rOrd } = useQuery({
    queryKey: queryKeys.orders,
    queryFn:  ordersApi.getAll,
  });

  const { data: unread, isLoading: nLoading, refetch: rNot } = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn:  notificationsApi.getUnread,
    refetchInterval: 30_000,
  });

  const isLoading = wLoading || oLoading || nLoading;

  const onRefresh = async () => { await Promise.all([rWh(), rOrd(), rNot()]); };

  if (isLoading) return <LoadingView />;

  const pendingOrders = orders?.filter((o) =>
    o.status === 'Requested' || o.status === 'Approved',
  ).length ?? 0;

  const roleLabel = role ? (sl.roles[role as keyof typeof sl.roles] ?? role) : '';
  const today = new Date().toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
    >
      {/* Hero header */}
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroDate}>{today}</Text>
          {!!roleLabel && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          )}
        </View>
        <Text style={styles.heroGreeting}>
          {sl.dashboard.greeting}, {user?.name ?? ''} 👋
        </Text>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KpiCard
          label={sl.dashboard.warehouses}
          value={warehouses?.length ?? 0}
          icon="business-outline"
          color="#3b82f6"
        />
        <KpiCard
          label={sl.dashboard.orders}
          value={orders?.length ?? 0}
          icon="receipt-outline"
          color="#0ea5e9"
          onPress={() => router.push('/(tabs)/orders')}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label={sl.dashboard.activeOrders}
          value={pendingOrders}
          icon="time-outline"
          color="#f59e0b"
          onPress={() => router.push('/(tabs)/orders')}
        />
        <KpiCard
          label={sl.dashboard.unread}
          value={unread?.length ?? 0}
          icon="notifications-outline"
          color="#dc2626"
          onPress={() => router.push('/(tabs)/notifications')}
        />
      </View>

      {/* Recent alerts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="alert-circle-outline" size={18} color="#1e293b" />
          <Text style={styles.sectionTitle}>{sl.dashboard.recentAlerts}</Text>
        </View>

        {unread && unread.length > 0 ? (
          <>
            {unread.slice(0, 5).map((n) => (
              <TouchableOpacity
                key={n.id}
                style={styles.alertCard}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/notifications')}
              >
                <View style={styles.alertDot} />
                <View style={styles.alertTextWrap}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.alertBody} numberOfLines={2}>{n.body}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#10b981" />
            <Text style={styles.emptyText}>{sl.notifications.noItems}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f1f5f9' },
  content:      { padding: 16, paddingBottom: 32 },

  hero:         { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 16 },
  heroTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroDate:     { color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' },
  roleBadge:    { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  roleBadgeText:{ color: '#e2e8f0', fontSize: 11, fontWeight: '700' },
  heroGreeting: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },

  kpiRow:       { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard:      { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  kpiIconWrap:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  kpiValue:     { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  kpiLabel:     { fontSize: 12, color: '#64748b', marginTop: 2 },

  section:      { marginTop: 8 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },

  alertCard:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  alertDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  alertTextWrap:{ flex: 1 },
  alertTitle:   { fontWeight: '700', color: '#1e293b', fontSize: 13 },
  alertBody:    { color: '#64748b', fontSize: 12, marginTop: 2 },

  emptyCard:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  emptyText:    { color: '#64748b', fontSize: 13 },
});
