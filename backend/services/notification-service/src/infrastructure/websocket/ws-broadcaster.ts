import { WebSocket } from 'ws';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { NotificationBroadcaster } from '../../application/ports/in/notification-broadcaster.port';
import { Notification } from '../../domain/entites/notification.entity';


export class WsBroadcaster implements NotificationBroadcaster {
  constructor(private readonly clients$: BehaviorSubject<Set<WebSocket>>) {}

  broadcast(notification: Notification): void {
    const message = JSON.stringify({ type: 'NOTIFICATION', payload: notification });

    // take(1) — snapshot the current clients set then unsubscribe immediately
    this.clients$.pipe(take(1)).subscribe(clients => {
      let sent = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sent++;
        }
      });
      console.log(`[WS] broadcast to ${sent} client(s): ${notification.title}`);
    });
  }
}