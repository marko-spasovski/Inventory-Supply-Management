import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fleetApi } from '@/lib/api/fleet';
import { queryKeys } from '@erp/domain';
import { sl } from '@/constants/i18n';
import { LoadingView } from '@/components/ui/LoadingView';
import { ErrorView } from '@/components/ui/ErrorView';
import { RoleGate } from '@/components/RoleGate';
import type { DriverResponse, VehicleResponse } from '@erp/api-types';

type Tab = 'drivers' | 'vehicles';

export default function FleetScreen(): React.ReactElement {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('drivers');

  const driversQ  = useQuery({ queryKey: queryKeys.drivers,  queryFn: fleetApi.getAllDrivers });
  const vehiclesQ = useQuery({ queryKey: queryKeys.vehicles, queryFn: fleetApi.getAllVehicles });

  const active = tab === 'drivers' ? driversQ : vehiclesQ;
  if (active.isLoading) return <LoadingView />;
  if (active.isError)   return <ErrorView onRetry={active.refetch} />;

  const goNew = () => router.push(tab === 'drivers'
    ? '/(tabs)/more/fleet/drivers/new'
    : '/(tabs)/more/fleet/vehicles/new');

  const emptyLabel = tab === 'drivers' ? sl.fleet.noDrivers : sl.fleet.noVehicles;
  const emptyCta   = tab === 'drivers' ? sl.fleet.newDriver : sl.fleet.newVehicle;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.fleet.title}</Text>
        <RoleGate feature="FLEET_WRITE">
          <TouchableOpacity onPress={goNew}>
            <Text style={styles.add}>＋</Text>
          </TouchableOpacity>
        </RoleGate>
      </View>

      <View style={styles.tabRow}>
        {(['drivers', 'vehicles'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'drivers' ? sl.fleet.drivers : sl.fleet.vehicles}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'drivers' ? (
        <FlatList
          data={(driversQ.data ?? []) as DriverResponse[]}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={driversQ.isFetching} onRefresh={driversQ.refetch} />}
          contentContainerStyle={(driversQ.data ?? []).length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚚</Text>
              <Text style={styles.empty}>{emptyLabel}</Text>
              <RoleGate feature="FLEET_WRITE">
                <TouchableOpacity style={styles.emptyCta} onPress={goNew}>
                  <Text style={styles.emptyCtaText}>{emptyCta}</Text>
                </TouchableOpacity>
              </RoleGate>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(tabs)/more/fleet/drivers/[id]', params: { id: item.id } })}
            >
              <Text style={styles.primary}>{item.name}</Text>
              {item.phone && <Text style={styles.meta}>{item.phone}</Text>}
              {item.email && <Text style={styles.meta}>{item.email}</Text>}
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={(vehiclesQ.data ?? []) as VehicleResponse[]}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={vehiclesQ.isFetching} onRefresh={vehiclesQ.refetch} />}
          contentContainerStyle={(vehiclesQ.data ?? []).length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚛</Text>
              <Text style={styles.empty}>{emptyLabel}</Text>
              <RoleGate feature="FLEET_WRITE">
                <TouchableOpacity style={styles.emptyCta} onPress={goNew}>
                  <Text style={styles.emptyCtaText}>{emptyCta}</Text>
                </TouchableOpacity>
              </RoleGate>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(tabs)/more/fleet/vehicles/[id]', params: { id: item.id } })}
            >
              <Text style={styles.primary}>{item.registrationPlate}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back:           { color: '#3b82f6', fontSize: 15 },
  title:          { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  add:            { color: '#3b82f6', fontSize: 22 },
  tabRow:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive:   { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText:        { color: '#64748b', fontSize: 14 },
  tabTextActive:  { color: '#3b82f6', fontWeight: '700' },
  list:           { padding: 12, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyState:     { alignItems: 'center', gap: 12 },
  emptyIcon:      { fontSize: 48 },
  empty:          { color: '#94a3b8' },
  emptyCta:       { marginTop: 4, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyCtaText:   { color: '#fff', fontWeight: '600', fontSize: 13 },
  card:           { backgroundColor: '#fff', borderRadius: 10, padding: 14, elevation: 1 },
  primary:        { fontWeight: '700', color: '#1e293b', fontSize: 14 },
  meta:           { color: '#64748b', fontSize: 12, marginTop: 2 },
});
