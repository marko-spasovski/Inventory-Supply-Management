import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not implement WebSocket — stub it so notifications panel mounts safely.
class StubWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN       = 1;
  static readonly CLOSING    = 2;
  static readonly CLOSED     = 3;
  readyState = StubWebSocket.CONNECTING;
  onopen:    ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror:   ((ev: Event) => void) | null = null;
  onclose:   ((ev: CloseEvent) => void) | null = null;
  send(_data: unknown): void {}
  close(): void { this.readyState = StubWebSocket.CLOSED; }
}
(globalThis as { WebSocket?: unknown }).WebSocket = StubWebSocket;

// Default fetch stub — tests can override with vi.stubGlobal('fetch', …).
if (!('fetch' in globalThis) || typeof (globalThis as { fetch?: unknown }).fetch !== 'function') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
}
