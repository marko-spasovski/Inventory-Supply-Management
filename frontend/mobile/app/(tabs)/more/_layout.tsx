import { Stack } from 'expo-router';
import React from 'react';

export default function MoreLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile"  options={{ presentation: 'modal' }} />
      <Stack.Screen name="ai"       options={{ presentation: 'card' }} />
      <Stack.Screen name="scanner"  options={{ presentation: 'modal' }} />
      <Stack.Screen name="products" options={{ presentation: 'card' }} />
      <Stack.Screen name="warehouses" options={{ presentation: 'card' }} />
      <Stack.Screen name="fleet"    options={{ presentation: 'card' }} />
      <Stack.Screen name="companies" options={{ presentation: 'card' }} />
    </Stack>
  );
}
