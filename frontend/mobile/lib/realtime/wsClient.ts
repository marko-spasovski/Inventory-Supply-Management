import { WS_URL } from '@/lib/http/client';
import type { WsNotificationMessage } from '@erp/api-types';

type MessageHandler = (msg: WsNotificationMessage) => void;
type StateHandler   = (state: WsConnectionState) => void;

export interface WsConnectionState {
  connected:      boolean;
  fallbackActive: boolean; // true after FALLBACK_AFTER_FAILURES consecutive failed attempts
}

const FALLBACK_AFTER_FAILURES = 3;

// WebSocket connects directly to notification-service :9091 (not via mobile-gateway).
// Mobile-gateway does not proxy WS upgrades (see ARCHITECTURE_GAPS.md Gap 7).
//
// Auth: notification-service now validates the JWT on the WS upgrade event
// (closed Gap 8 — see CHANGELOG.md). We pass the token as `?token=<jwt>` —
// any missing/invalid token is rejected with WS close code 4001.
//
// After FALLBACK_AFTER_FAILURES consecutive failures we set fallbackActive=true so the
// consumer can switch to HTTP polling. Reconnection keeps trying in the background at
// the capped delay so the WS can recover if the server comes back.
export class ReconnectingWsClient {
  private ws: WebSocket | null = null;
  private destroyed = false;
  private retryDelay = 1_000;
  private readonly maxDelay = 60_000;
  private readonly handlers      = new Set<MessageHandler>();
  private readonly stateHandlers = new Set<StateHandler>();
  private _connected = false;
  private failureCount = 0;

  get connected(): boolean { return this._connected; }
  get fallbackActive(): boolean { return this.failureCount >= FALLBACK_AFTER_FAILURES; }

  connect(token?: string): void {
    if (this.destroyed) return;
    const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this._connected = true;
      this.retryDelay = 1_000;
      this.failureCount = 0;
      this.emitState();
      console.log('[WS] connected to', WS_URL);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsNotificationMessage;
        this.handlers.forEach((h) => h(msg));
      } catch {
        // malformed message — ignore
      }
    };

    this.ws.onclose = () => {
      const wasConnected = this._connected;
      this._connected = false;
      if (!wasConnected) this.failureCount += 1;
      this.emitState();
      if (!this.destroyed) this.scheduleReconnect(token);
    };

    this.ws.onerror = () => {
      this._connected = false;
      this.emitState();
    };
  }

  private scheduleReconnect(token?: string): void {
    setTimeout(() => this.connect(token), this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, this.maxDelay);
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler({ connected: this._connected, fallbackActive: this.fallbackActive });
    return () => this.stateHandlers.delete(handler);
  }

  private emitState(): void {
    const state: WsConnectionState = {
      connected:      this._connected,
      fallbackActive: this.fallbackActive,
    };
    this.stateHandlers.forEach((h) => h(state));
  }

  destroy(): void {
    this.destroyed = true;
    this.ws?.close();
    this.handlers.clear();
    this.stateHandlers.clear();
  }
}
