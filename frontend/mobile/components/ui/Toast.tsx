// Global slide-in toast. Mounted once in the root layout; any screen triggers
// it via useToastStore().show(...) or the showToast() helper. Auto-dismisses
// after a short delay.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/toastStore';

const DURATION_MS = 2600;

export function ToastHost(): React.ReactElement | null {
  const insets  = useSafeAreaInsets();
  const visible = useToastStore((s) => s.visible);
  const message = useToastStore((s) => s.message);
  const variant = useToastStore((s) => s.variant);
  const hide    = useToastStore((s) => s.hide);

  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => hide());
    }, DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, message, variant, anim, hide]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { bottom: insets.bottom + 24, backgroundColor: variant === 'success' ? '#16a34a' : '#dc2626' },
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
      accessibilityRole="alert"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 1000,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : null),
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
