import { Notification } from "../../../domain/entites/notification.entity";

export interface NotificationBroadcaster {
  broadcast(notification: Notification): void;
}