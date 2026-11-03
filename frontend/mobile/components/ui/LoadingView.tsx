import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export function LoadingView(): React.ReactElement {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
