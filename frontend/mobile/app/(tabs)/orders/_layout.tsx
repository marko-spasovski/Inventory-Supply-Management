import { Stack } from 'expo-router';
import React from 'react';
import { sl } from '@/constants/i18n';

export default function OrdersLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ presentation: 'modal', title: sl.orders.newOrder }} />
    </Stack>
  );
}
