import { Stack } from 'expo-router';
import React from 'react';

// Nested stack so expo-router doesn't warn about "no route named 'products'"
// from the parent /more/_layout.tsx (it treats each subdirectory as its own
// route group when there's a _layout here).
export default function ProductsLayout(): React.ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />;
}
