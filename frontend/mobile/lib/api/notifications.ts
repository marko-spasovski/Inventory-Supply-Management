import { axiosClient } from '@/lib/http/client';
import type { NotificationResponse } from '@erp/api-types';

export type DevicePlatform = 'ios' | 'android' | 'web';

export const notificationsApi = {
  getAll: async (): Promise<NotificationResponse[]> => {
    const res = await axiosClient.get<NotificationResponse[]>('/notifications');
    return res.data;
  },

  getUnread: async (): Promise<NotificationResponse[]> => {
    const res = await axiosClient.get<NotificationResponse[]>('/notifications/unread');
    return res.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await axiosClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await axiosClient.patch('/notifications/read-all');
  },

  // Push scaffold — POSTs (token, platform) to notification-service so a
  // future fan-out worker can target this device.
  registerDeviceToken: async (token: string, platform: DevicePlatform): Promise<void> => {
    await axiosClient.post('/notifications/device-tokens', { token, platform });
  },

  unregisterDeviceToken: async (token: string): Promise<void> => {
    await axiosClient.delete(`/notifications/device-tokens/${encodeURIComponent(token)}`);
  },
};
