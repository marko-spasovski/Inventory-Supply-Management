import { WebSocketServer, WebSocket } from 'ws';
import { BehaviorSubject } from 'rxjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

interface AuthClaims {
  sub:    string;   // email
  role:   string;
  userId: string;
}

export class WsServer {
  private readonly wss: WebSocketServer;

  // Reactive state — always holds the current set of live connections
  readonly clients$ = new BehaviorSubject<Set<WebSocket>>(new Set());

  constructor() {
    // We bind to the port ourselves so we can intercept the upgrade and reject
    // connections whose JWT is missing or invalid. Auth-service signs tokens
    // with the raw UTF-8 bytes of `config.ws.jwtSecret` (see auth-service
    // JwtService.java).
    this.wss = new WebSocketServer({
      port: config.ws.port,
      verifyClient: (info, done) => {
        if (!config.ws.requireAuth) return done(true);

        const claims = this.extractAndVerifyToken(info.req.url);
        if (!claims) {
          console.warn('[WS] rejecting connection — missing or invalid token');
          return done(false, 4001, 'Unauthorized');
        }

        // Stash the claims on the request so the connection handler can read them.
        (info.req as unknown as { auth?: AuthClaims }).auth = claims;
        return done(true);
      },
    });
    this.bindEvents();
    console.log(`[WS] listening on port ${config.ws.port} (auth=${config.ws.requireAuth ? 'on' : 'off'})`);
  }

  private extractAndVerifyToken(rawUrl: string | undefined): AuthClaims | null {
    if (!rawUrl) return null;
    try {
      const url   = new URL(rawUrl, 'ws://placeholder');
      const token = url.searchParams.get('token');
      if (!token) return null;
      const decoded = jwt.verify(token, config.ws.jwtSecret) as AuthClaims;
      return decoded;
    } catch {
      return null;
    }
  }

  private bindEvents(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const claims = (req as unknown as { auth?: AuthClaims }).auth;

      const next = new Set(this.clients$.value);
      next.add(ws);
      this.clients$.next(next);
      console.log(`[WS] client connected (user=${claims?.sub ?? 'anonymous'}) — total: ${next.size}`);

      ws.send(JSON.stringify({ type: 'CONNECTED' }));

      ws.on('close', () => {
        const updated = new Set(this.clients$.value);
        updated.delete(ws);
        this.clients$.next(updated);
        console.log(`[WS] client disconnected — total: ${updated.size}`);
      });

      ws.on('error', err =>
        console.error('[WS] client error:', err.message)
      );
    });
  }

  close(): void { this.wss.close(); }
}
