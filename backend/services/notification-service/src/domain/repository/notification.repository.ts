import { Observable } from 'rxjs';
import { Notification } from '../entites/notification.entity';

export interface NotificationRepository {
  save(notification: Notification): Observable<Notification>;
  findAll(limit?: number): Observable<Notification[]>;
  findUnread(): Observable<Notification[]>;
  markAsRead(id: string): Observable<void>;
  markAllAsRead(): Observable<void>;
}