import { BehaviorSubject } from 'rxjs';
import { WebSocket } from 'ws';
import { WsBroadcaster } from '../infrastructure/websocket/ws-broadcaster';
import { Notification } from '../domain/entites/notification.entity';

function makeClient(state: number): WebSocket {
  return { readyState: state, send: jest.fn() } as unknown as WebSocket;
}

function sample(): Notification {
  return {
    id: 'n-1',
    category: 'ORDER',
    severity: 'info',
    title: 'Hello',
    message: 'world',
    resourceId: null,
    read: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('WsBroadcaster', () => {
  // Silence the console.log inside broadcast() so test output stays clean.
  let logSpy: jest.SpyInstance;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });

  it('sends JSON to every open client', () => {
    const a = makeClient(WebSocket.OPEN);
    const b = makeClient(WebSocket.OPEN);
    const broadcaster = new WsBroadcaster(new BehaviorSubject(new Set([a, b])));

    broadcaster.broadcast(sample());

    expect(a.send).toHaveBeenCalledTimes(1);
    expect(b.send).toHaveBeenCalledTimes(1);
    const msg = JSON.parse((a.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('NOTIFICATION');
    expect(msg.payload.title).toBe('Hello');
  });

  it('skips non-open clients', () => {
    const open = makeClient(WebSocket.OPEN);
    const closed = makeClient(WebSocket.CLOSED);
    const broadcaster = new WsBroadcaster(new BehaviorSubject(new Set([open, closed])));

    broadcaster.broadcast(sample());

    expect(open.send).toHaveBeenCalled();
    expect(closed.send).not.toHaveBeenCalled();
  });

  it('handles empty client set without error', () => {
    const broadcaster = new WsBroadcaster(new BehaviorSubject(new Set<WebSocket>()));
    expect(() => broadcaster.broadcast(sample())).not.toThrow();
  });
});
