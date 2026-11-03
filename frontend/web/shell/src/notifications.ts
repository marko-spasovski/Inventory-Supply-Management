import { useEffect, useRef, useState, useCallback } from 'react';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';
export type NotificationCategory = 'ORDER' | 'INVENTORY' | 'WAREHOUSE';

export interface AppNotification {
  id:         string;
  category:   NotificationCategory;
  severity:   NotificationSeverity;
  title:      string;
  message:    string;
  resourceId: string | null;
  read:       boolean;
  createdAt:  string;
}

interface WsEnvelope {
  type:     string;
  payload?: AppNotification;
}

const HTTP = '/api/notifications';

const WS_URL = ((): string => {
  if (typeof window === 'undefined') return 'ws://localhost:9091';
  const env = (import.meta as unknown as { env?: { VITE_WS_URL?: string; PROD?: boolean } }).env;
  if (env?.VITE_WS_URL) return env.VITE_WS_URL;
  // Production (single-host OpenShift) serves the notification WebSocket on the
  // same origin under /ws (nginx upgrades + proxies it to notification-service).
  if (env?.PROD) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/ws`;
  }
  return `ws://${window.location.hostname}:9091`;
})();

export function useNotifications() {
  const [items, setItems]   = useState<AppNotification[]>([]);
  const [error, setError]   = useState('');
  const wsRef               = useRef<WebSocket | null>(null);
  const retryRef            = useRef<number>(0);
  const reconnectTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef           = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(HTTP, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to load');
      setItems(await r.json() as AppNotification[]);
    } catch (e) { setError(String(e)); }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch(`${HTTP}/${id}/read`, { method: 'PATCH', credentials: 'include' });
  }, []);

  const markAllRead = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    await fetch(`${HTTP}/read-all`, { method: 'PATCH', credentials: 'include' });
  }, []);

  useEffect(() => {
    closedRef.current = false;
    void load();

    const MAX_RETRIES = 5;
    async function fetchTicket(): Promise<string | null> {
      try {
        const r = await fetch(`${HTTP}/ws-ticket`, { credentials: 'include' });
        if (!r.ok) return null;
        const body = await r.json() as { token?: string };
        return body.token ?? null;
      } catch {
        return null;
      }
    }
    async function connect() {
      if (closedRef.current) return;
      try {
        const ticket = await fetchTicket();
        if (closedRef.current) return;
        if (!ticket) {
          // No session yet — schedule a retry so the panel reconnects once the user logs in.
          retryRef.current++;
          if (retryRef.current > MAX_RETRIES) return;
          const delay = Math.min(retryRef.current * 2000, 15000);
          reconnectTimerRef.current = setTimeout(() => { void connect(); }, delay);
          return;
        }
        const url = `${WS_URL}?token=${encodeURIComponent(ticket)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => { retryRef.current = 0; };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data) as WsEnvelope;
            if (msg.type === 'NOTIFICATION' && msg.payload) {
              const n = msg.payload;
              setItems(prev => prev.some(p => p.id === n.id) ? prev : [n, ...prev]);
            }
          } catch { /* ignore non-JSON */ }
        };
        ws.onerror = () => { /* let close handler decide */ };
        ws.onclose = () => {
          if (closedRef.current) return;
          retryRef.current++;
          if (retryRef.current > MAX_RETRIES) {
            console.warn('[notifications] giving up reconnecting — notification-service unreachable');
            return;
          }
          const delay = Math.min(retryRef.current * 2000, 15000);
          reconnectTimerRef.current = setTimeout(() => { void connect(); }, delay);
        };
      } catch (e) {
        console.warn('[notifications] ws connect failed', e);
      }
    }
    void connect();

    return () => {
      closedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [load]);

  const unreadCount = items.filter(n => !n.read).length;

  return { items, unreadCount, error, markRead, markAllRead, reload: load };
}
