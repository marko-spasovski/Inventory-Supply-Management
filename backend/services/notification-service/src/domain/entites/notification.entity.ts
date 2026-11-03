export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';
export type NotificationCategory = 'ORDER' | 'INVENTORY' | 'WAREHOUSE';

export interface Notification {
  id:         string;
  category:   NotificationCategory;
  severity:   NotificationSeverity;
  title:      string;
  message:    string;
  resourceId: string | null;
  read:       boolean;
  createdAt:  Date;
}

export function createNotification(
  params: Omit<Notification, 'id' | 'read' | 'createdAt'>
): Notification {
  return {
    ...params,
    id:        crypto.randomUUID(),
    read:      false,
    createdAt: new Date(),
  };
}