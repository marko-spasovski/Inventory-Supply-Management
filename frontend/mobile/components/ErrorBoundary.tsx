import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
import { sl } from '@/constants/i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Top-level boundary so a render-time exception in any screen shows a friendly
// recovery card instead of a white screen. Captures app version and platform
// for copy/paste into a bug report; we don't ship Sentry here yet.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    const { version, slug } = Constants.expoConfig ?? {};
    const platform = `${Platform.OS} ${Platform.Version}`;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>{sl.common.error}</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>

          <View style={styles.metaCard}>
            <MetaRow label="App" value={`${slug ?? 'pocket-logistics-pro'} ${version ?? ''}`} />
            <MetaRow label="Platform" value={platform} />
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={this.handleReset}>
            <Text style={styles.resetText}>{sl.common.retry}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

function MetaRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} selectable>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f1f5f9' },
  content:   { padding: 24, paddingTop: 80, alignItems: 'center', gap: 12 },
  icon:      { fontSize: 56, marginBottom: 4 },
  title:     { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  message:   { fontSize: 14, color: '#b91c1c', textAlign: 'center', marginTop: 4 },
  metaCard:  { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 16, gap: 6 },
  metaRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  metaValue: { fontSize: 12, color: '#1e293b', fontFamily: 'monospace', flexShrink: 1, textAlign: 'right' },
  resetBtn:  { marginTop: 16, backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  resetText: { color: '#fff', fontWeight: '700' },
});
