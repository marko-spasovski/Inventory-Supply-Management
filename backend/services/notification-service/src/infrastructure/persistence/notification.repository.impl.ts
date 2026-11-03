import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Pool } from 'pg';
import { Notification } from '../../domain/entites/notification.entity';
import { NotificationRepository } from '../../domain/repository/notification.repository';


interface NotificationRow {
  id:          string;
  category:    string;
  severity:    string;
  title:       string;
  message:     string;
  resource_id: string | null;
  read:        boolean;
  created_at:  Date;
}

function rowToEntity(row: NotificationRow): Notification {
  return {
    id:         row.id,
    category:   row.category as Notification['category'],
    severity:   row.severity as Notification['severity'],
    title:      row.title,
    message:    row.message,
    resourceId: row.resource_id,
    read:       row.read,
    createdAt:  row.created_at,
  };
}

export class PgNotificationRepository implements NotificationRepository {
  constructor(private readonly pool: Pool) {}

  save(notification: Notification): Observable<Notification> {
    return from(
      this.pool.query<NotificationRow>(
        `INSERT INTO notifications (id, category, severity, title, message, resource_id, read, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [notification.id, notification.category, notification.severity,
         notification.title, notification.message, notification.resourceId,
         notification.read, notification.createdAt]
      )
    ).pipe(
      map(r => rowToEntity(r.rows[0])),
      catchError(err => throwError(() => new Error(`[Repo] save: ${err.message}`))),
    );
  }

  findAll(limit = 50): Observable<Notification[]> {
    return from(
      this.pool.query<NotificationRow>(
        `SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1`, [limit]
      )
    ).pipe(
      map(r => r.rows.map(rowToEntity)),
      catchError(err => throwError(() => new Error(`[Repo] findAll: ${err.message}`))),
    );
  }

  findUnread(): Observable<Notification[]> {
    return from(
      this.pool.query<NotificationRow>(
        `SELECT * FROM notifications WHERE read = FALSE ORDER BY created_at DESC`
      )
    ).pipe(
      map(r => r.rows.map(rowToEntity)),
      catchError(err => throwError(() => new Error(`[Repo] findUnread: ${err.message}`))),
    );
  }

  markAsRead(id: string): Observable<void> {
    return from(
      this.pool.query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id])
    ).pipe(
      map(() => void 0),
      catchError(err => throwError(() => new Error(`[Repo] markAsRead: ${err.message}`))),
    );
  }

  markAllAsRead(): Observable<void> {
    return from(
      this.pool.query(`UPDATE notifications SET read = TRUE WHERE read = FALSE`)
    ).pipe(
      map(() => void 0),
      catchError(err => throwError(() => new Error(`[Repo] markAllAsRead: ${err.message}`))),
    );
  }
}