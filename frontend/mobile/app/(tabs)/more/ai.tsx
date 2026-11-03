// AI Analysis screen — wired to ai-service (Gap 6 closed).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { aiClient, type AiInventorySummary } from '@/lib/ai/aiClient';
import { sl } from '@/constants/i18n';
import { RoleGate } from '@/components/RoleGate';
import { formatApiError } from '@/lib/http/errors';

function AiContent(): React.ReactElement {
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, isError, refetch, isFetching, error } = useQuery({
    queryKey: ['ai', 'inventory-summary'],
    queryFn:  aiClient.getInventorySummary,
    enabled,
    retry:    0,
  });

  if (!enabled) {
    return <InfoCard onAcknowledge={() => setEnabled(true)} />;
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{sl.ai.loading}</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.unavailableIcon}>🤖</Text>
        <Text style={styles.unavailableText}>{sl.ai.unavailable}</Text>
        <Text style={styles.gapNote}>{formatApiError(error)}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => refetch()}>
          <Text style={styles.secondaryBtnText}>{sl.ai.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <SummaryView data={data} refreshing={isFetching} onRefresh={refetch} />;
}

function InfoCard({ onAcknowledge }: { onAcknowledge: () => void }): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.cardContent}>
      <Text style={styles.heroIcon}>🤖</Text>
      <Text style={styles.heroTitle}>{sl.ai.title}</Text>
      <Text style={styles.heroIntro}>{sl.ai.intro}</Text>
      <View style={styles.bullets}>
        <Bullet text={sl.ai.bullet1} />
        <Bullet text={sl.ai.bullet2} />
        <Bullet text={sl.ai.bullet3} />
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={onAcknowledge}>
        <Text style={styles.primaryBtnText}>{sl.ai.acknowledge}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SummaryView({ data, refreshing, onRefresh }: { data: AiInventorySummary; refreshing: boolean; onRefresh: () => void }): React.ReactElement {
  return (
    <ScrollView
      contentContainerStyle={styles.dataContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.summaryCard, data.source === 'azure' ? styles.summaryAzure : styles.summaryTemplate]}>
        <Text style={styles.summaryText}>{data.summary}</Text>
        <Text style={styles.sourceText}>
          {data.source === 'azure' ? sl.ai.sourceAzure : sl.ai.sourceLocal} ·{' '}
          {new Date(data.generatedAt).toLocaleString('sl-SI')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sl.ai.totals}</Text>
        <View style={styles.totalsGrid}>
          <Totalcell label={sl.ai.products}    value={data.totals.productCount} />
          <Totalcell label={sl.ai.warehouses}  value={data.totals.warehouseCount} />
          <Totalcell label={sl.ai.totalStock}  value={data.totals.totalStock} />
          <Totalcell label={sl.ai.lowStock}    value={data.totals.lowStockCount} warn={data.totals.lowStockCount > 0} />
        </View>
      </View>

      {data.alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sl.ai.alerts}</Text>
          {data.alerts.map((a) => (
            <View key={a.productId + a.warehouseId} style={styles.alertCard}>
              <Text style={styles.alertProduct}>{a.productName}</Text>
              <Text style={styles.alertMeta}>
                {a.currentQty} / min {a.minQty}
              </Text>
            </View>
          ))}
        </View>
      )}

      {data.reorderSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sl.ai.reorder}</Text>
          {data.reorderSuggestions.map((s) => (
            <View key={s.productId + s.warehouseId} style={styles.reorderCard}>
              <View style={styles.reorderHeader}>
                <Text style={styles.reorderProduct} numberOfLines={1}>{s.productName}</Text>
                <View style={styles.reorderBadge}>
                  <Text style={styles.reorderBadgeText}>+{s.suggestedQty}</Text>
                </View>
              </View>
              <Text style={styles.reorderLabel}>{sl.ai.suggestedQty}: {s.suggestedQty}</Text>
              <Text style={styles.reorderReason}>{s.reasoning}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Bullet({ text }: { text: string }): React.ReactElement {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function Totalcell({ label, value, warn }: { label: string; value: number; warn?: boolean }): React.ReactElement {
  return (
    <View style={[styles.totalCell, warn && styles.totalCellWarn]}>
      <Text style={[styles.totalValue, warn && styles.totalValueWarn]}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

export default function AiScreen(): React.ReactElement {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {sl.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{sl.ai.title}</Text>
        <View style={{ width: 60 }} />
      </View>
      <RoleGate
        feature="AI_ANALYSIS"
        fallback={
          <View style={styles.center}>
            <Text style={styles.unavailableText}>{sl.common.accessDenied}</Text>
          </View>
        }
      >
        <AiContent />
      </RoleGate>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#f1f5f9' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back:             { color: '#3b82f6', fontSize: 15 },
  title:            { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  cardContent:      { padding: 24, alignItems: 'center', gap: 12 },
  heroIcon:         { fontSize: 56, marginBottom: 8 },
  heroTitle:        { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  heroIntro:        { fontSize: 14, color: '#475569', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  bullets:          { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 },
  bullet:           { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletDot:        { color: '#3b82f6', fontWeight: '700', fontSize: 16, lineHeight: 20 },
  bulletText:       { flex: 1, color: '#374151', fontSize: 13, lineHeight: 20 },
  gapNote:          { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18, marginTop: 8 },
  primaryBtn:       { backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  primaryBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn:     { backgroundColor: '#dbeafe', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 12 },
  secondaryBtnText: { color: '#3b82f6', fontWeight: '600' },
  unavailableIcon:  { fontSize: 48, marginBottom: 16 },
  unavailableText:  { fontSize: 16, fontWeight: '600', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  loadingText:      { marginTop: 12, color: '#64748b' },
  dataContent:      { padding: 16, gap: 12 },
  summaryCard:      { borderRadius: 12, padding: 14, borderLeftWidth: 3 },
  summaryAzure:     { backgroundColor: '#eef2ff', borderLeftColor: '#3b82f6' },
  summaryTemplate:  { backgroundColor: '#fff', borderLeftColor: '#94a3b8' },
  summaryText:      { fontSize: 14, color: '#1e293b', lineHeight: 22 },
  sourceText:       { fontSize: 11, color: '#64748b', marginTop: 8 },
  section:          { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  totalsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  totalCell:        { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  totalCellWarn:    { backgroundColor: '#fef3c7' },
  totalValue:       { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  totalValueWarn:   { color: '#b45309' },
  totalLabel:       { fontSize: 11, color: '#64748b', marginTop: 2 },
  alertCard:        { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10 },
  alertProduct:     { color: '#92400e', fontWeight: '600', fontSize: 13 },
  alertMeta:        { color: '#b45309', fontSize: 11, marginTop: 2 },
  reorderCard:      { backgroundColor: '#ecfdf5', borderRadius: 8, padding: 10 },
  reorderHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reorderProduct:   { color: '#065f46', fontWeight: '700', fontSize: 13, flex: 1, marginRight: 8 },
  reorderBadge:     { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  reorderBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  reorderLabel:     { color: '#065f46', fontSize: 11, marginTop: 4 },
  reorderReason:    { color: '#047857', fontSize: 11, marginTop: 4, lineHeight: 16 },
});
