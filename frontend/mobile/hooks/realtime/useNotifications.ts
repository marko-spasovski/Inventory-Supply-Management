import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { ReconnectingWsClient, type WsConnectionState } from '@/lib/realtime/wsClient';
import { queryKeys } from '@erp/domain';
import type { WsNotificationMessage } from '@erp/api-types';

// Single shared WS client across the app. Multiple components can call
// useNotificationsSocket without opening multiple sockets.
let sharedClient: ReconnectingWsClient | null = null;
let sharedToken:  string | null = null;
let subscriberCount = 0;

function ensureClient(token: string): ReconnectingWsClient {
  if (sharedClient && sharedToken === token) return sharedClient;
  sharedClient?.destroy();
  sharedClient = new ReconnectingWsClient();
  sharedToken  = token;
  sharedClient.connect(token);
  return sharedClient;
}

function teardownIfIdle(): void {
  if (subscriberCount === 0) {
    sharedClient?.destroy();
    sharedClient = null;
    sharedToken  = null;
  }
}

// Connects to the notification-service WebSocket and invalidates React Query
// caches when relevant events arrive. Exposes the connection state so the UI can
// fall back to HTTP polling when the WS gives up.
//
// NOTE: WebSocket has no JWT validation yet (ARCHITECTURE_GAPS.md Gap 8).
// This hook connects without a token. Once backend adds auth, pass token here.
export function useNotificationsSocket(): WsConnectionState {
  const queryClient = useQueryClient();
  const token       = useAuthStore((s) => s.token);
  const [state, setState] = useState<WsConnectionState>({ connected: false, fallbackActive: false });

  useEffect(() => {
    if (!token) {
      setState({ connected: false, fallbackActive: false });
      return;
    }

    const client = ensureClient(token);
    subscriberCount += 1;

    const unsubscribeMessages = client.subscribe((msg: WsNotificationMessage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread });

      switch (msg.topic) {
        case 'order.created':
        case 'order.status.changed':
          queryClient.invalidateQueries({ queryKey: queryKeys.orders });
          break;
        case 'inventory.low':
        case 'inventory.out':
          queryClient.invalidateQueries({ queryKey: queryKeys.stockAll });
          break;
        case 'warehouse.capacity':
          queryClient.invalidateQueries({ queryKey: queryKeys.warehouses });
          break;
      }
    });

    const unsubscribeState = client.onStateChange(setState);

    return () => {
      unsubscribeMessages();
      unsubscribeState();
      subscriberCount -= 1;
      teardownIfIdle();
    };
  }, [token, queryClient]);

  return state;
}
