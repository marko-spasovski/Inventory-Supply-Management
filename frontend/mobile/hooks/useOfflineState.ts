// Connectivity hook — subscribes to NetInfo and reports whether the device
// has a usable internet connection. Used by the global OfflineBanner.
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineState {
  online: boolean;       // false when there is no usable connection
}

export function useOfflineState(): OfflineState {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Snapshot the current state so the banner can flash correctly on launch.
    NetInfo.fetch().then((s) => {
      setOnline(!!(s.isConnected && (s.isInternetReachable ?? true)));
    });

    const unsubscribe = NetInfo.addEventListener((s) => {
      // `isInternetReachable` is null when unknown (e.g. wifi just connected,
      // probe pending) — treat null as still-online so we don't flap.
      const reachable = s.isInternetReachable ?? true;
      setOnline(!!(s.isConnected && reachable));
    });

    return () => unsubscribe();
  }, []);

  return { online };
}
