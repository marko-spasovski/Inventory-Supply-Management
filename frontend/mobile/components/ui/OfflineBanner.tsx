import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { sl } from '@/constants/i18n';

interface Props {
  visible: boolean;
}

export function OfflineBanner({ visible }: Props): React.ReactElement | null {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{sl.common.noInternet}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
