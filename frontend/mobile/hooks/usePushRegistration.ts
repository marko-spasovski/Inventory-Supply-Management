import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { notificationsApi, type DevicePlatform } from '@/lib/api/notifications';

// Push-notification scaffold (Gap-side task #16 partial).
//
// When the user is authenticated:
//   1. Ask for notification permission (no-op if already granted).
//   2. Fetch the Expo push token.
//   3. POST it to notification-service so a future fan-out worker can target
//      this device.
//
// What's *not* here (intentional, see CHANGELOG): no real APNS/FCM send path,
// no in-app handler beyond Expo's default. The backend table is in place;
// fanning out from Kafka events is a separate worker task.
export function usePushRegistration(): void {
  const token        = useAuthStore((s) => s.token);
  const userId       = useAuthStore((s) => s.user?.id ?? null);
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !userId) return;
    // Dedup per-user — we don't need to re-register every render.
    if (registeredFor.current === userId) return;

    (async () => {
      try {
        // Expo Go on iOS won't issue real device tokens (Apple's restriction
        // for unsigned bundles). Skip silently so dev doesn't see errors.
        if (Constants.appOwnership === 'expo' && Platform.OS === 'ios') {
          console.log('[push] skipping registration in Expo Go on iOS');
          return;
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (existing !== 'granted') {
          const ask = await Notifications.requestPermissionsAsync();
          status = ask.status;
        }
        if (status !== 'granted') {
          console.log('[push] permission denied — skipping registration');
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId
          ?? Constants.easConfig?.projectId;
        const tokenResult = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const platform: DevicePlatform =
          Platform.OS === 'android' ? 'android' :
          Platform.OS === 'ios'     ? 'ios'     :
          'web';

        await notificationsApi.registerDeviceToken(tokenResult.data, platform);
        registeredFor.current = userId;
        console.log('[push] device token registered:', tokenResult.data.slice(0, 14) + '…');
      } catch (err) {
        // Push is best-effort — never block the app.
        console.warn('[push] registration failed:', (err as Error).message);
      }
    })();
  }, [token, userId]);
}
