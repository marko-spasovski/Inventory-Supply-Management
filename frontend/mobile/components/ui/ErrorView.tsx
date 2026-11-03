import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { sl } from '@/constants/i18n';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message ?? sl.common.error}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>{sl.common.retry}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message:    { fontSize: 15, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  btn:        { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  btnText:    { color: '#fff', fontWeight: '600' },
});
