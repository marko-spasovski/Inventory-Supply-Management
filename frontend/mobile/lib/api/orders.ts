import { axiosClient } from '@/lib/http/client';
import { ORDER_STATUS_NAMES, type OrderStatus } from '@erp/domain';
import {
  type OrderResponse,
  type CreateOrderRequest,
} from '@erp/api-types';

// Backend serialises Status as a numeric ordinal (0..3). UI uses the string
// names. Normalise every response here so the rest of the app stays in string
// space.
type WireOrder = Omit<OrderResponse, 'status'> & { status: OrderStatus | number };

function normalize(o: WireOrder): OrderResponse {
  const raw = o.status as OrderStatus | number;
  const status: OrderStatus =
    typeof raw === 'number'
      ? (ORDER_STATUS_NAMES[raw] ?? 'Requested')
      : raw;
  return { ...o, status };
}

export const ordersApi = {
  getAll: async (): Promise<OrderResponse[]> => {
    const res = await axiosClient.get<WireOrder[]>('/orders');
    return res.data.map(normalize);
  },

  // Gap 3 closed: order-service accepts ?driverId= as a server-side filter.
  getByDriver: async (driverId: string): Promise<OrderResponse[]> => {
    const res = await axiosClient.get<WireOrder[]>('/orders', { params: { driverId } });
    return res.data.map(normalize);
  },

  // Backend Gap 11 closed: order-service exposes GET /orders/{id}.
  getById: async (id: string): Promise<OrderResponse | null> => {
    try {
      const res = await axiosClient.get<WireOrder>(`/orders/${id}`);
      return normalize(res.data);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 404) return null;
      throw err;
    }
  },

  create: async (body: CreateOrderRequest): Promise<OrderResponse> => {
    const res = await axiosClient.post<WireOrder>('/orders', body);
    return normalize(res.data);
  },

  // Mobile-gateway: PUT /orders/:id/status { status: number }
  updateStatus: async (id: string, statusValue: number): Promise<OrderResponse> => {
    const res = await axiosClient.put<WireOrder>(`/orders/${id}/status`, { status: statusValue });
    return normalize(res.data);
  },

  // POST /orders/upload-document (multipart). Body matches the web flow:
  // { File: <pdf>, OrderId: <id> }. The backend stores the delivery
  // document; the caller is responsible for advancing status to Closed.
  uploadDocument: async (orderId: string, file: { uri: string; name: string; mimeType?: string | null }): Promise<void> => {
    const form = new FormData();
    // React Native FormData accepts this shape — TypeScript doesn't know about it.
    form.append('File', {
      uri:  file.uri,
      name: file.name,
      type: file.mimeType ?? 'application/pdf',
    } as unknown as Blob);
    form.append('OrderId', orderId);
    await axiosClient.post('/orders/upload-document', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
