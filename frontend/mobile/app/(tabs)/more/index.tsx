import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { sl } from '@/constants/i18n';
import { useHasFeature } from '@/hooks/useHasFeature';

interface MenuEntry {
  label:   string;
  icon:    keyof typeof Ionicons.glyphMap;
  route:   string;
  feature?: Parameters<typeof useHasFeature>[0];
}

export default function MoreScreen(): React.ReactElement {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const role   = useAuthStore((s) => s.role);

  // Build the menu inside render so each label is resolved against the active
  // locale through the `sl` proxy. A module-level array would freeze the
  // labels at whichever locale was active when this module first loaded.
  const menuEntries: MenuEntry[] = [
    { label: sl.products.title,    icon: 'cube-outline',          route: '/(tabs)/more/products',    feature: 'PRODUCTS_READ'   },
    { label: sl.warehouses.title,  icon: 'business-outline',      route: '/(tabs)/more/warehouses',  feature: 'WAREHOUSES_READ' },
    { label: sl.fleet.title,       icon: 'car-outline',           route: '/(tabs)/more/fleet',       feature: 'FLEET_READ'      },
    { label: sl.companies.title,   icon: 'briefcase-outline',     route: '/(tabs)/more/companies',   feature: 'COMPANIES_READ'  },
    { label: sl.scanner.title,     icon: 'barcode-outline',       route: '/(tabs)/more/scanner',     feature: 'SCANNER'         },
    { label: sl.ai.title,          icon: 'sparkles-outline',      route: '/(tabs)/more/ai',          feature: 'AI_ANALYSIS'     },
    { label: sl.profile.title,     icon: 'person-circle-outline', route: '/(tabs)/more/profile'                                 },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userRole}>{sl.roles[role]}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuEntries.map((entry) => (
            <MenuRow key={entry.route} entry={entry} onPress={() => router.push(entry.route as any)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ entry, onPress }: { entry: MenuEntry; onPress: () => void }): React.ReactElement {
  const allowed = entry.feature ? useHasFeature(entry.feature) : true;
  if (!allowed) return <></>;
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuIcon}>
        <Ionicons name={entry.icon} size={20} color="#3b82f6" />
      </View>
      <Text style={styles.menuLabel}>{entry.label}</Text>
      <Ionicons name="chevron-forward-outline" size={16} color="#94a3b8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f1f5f9' },
  content:   { padding: 16 },
  userCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  avatar:    { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarText:{ color: '#fff', fontSize: 20, fontWeight: '700' },
  userName:  { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  userRole:  { fontSize: 13, color: '#64748b', marginTop: 2 },
  menu:      { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  menuRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuIcon:  { width: 32, height: 32, borderRadius: 8, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '500' },
});
