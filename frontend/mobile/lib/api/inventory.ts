import { axiosClient } from '@/lib/http/client';
import type { InventoryResponse } from '@erp/api-types';

export interface UpdateThresholdsRequest {
  productId:    string;
  warehouseId:  string;
  minQuantity:  number | null;
  maxQuantity:  number | null;
}

// Mobile-gateway serves /stock/* and rewrites to /inventory/* downstream.
// Stock is only ever created server-side (via order closure), so there's no
// addStock here on purpose — the mobile screens expose consume + threshold
// edits only.
export const inventoryApi = {
  getAll: async (): Promise<InventoryResponse[]> => {
    const res = await axiosClient.get<InventoryResponse[]>('/stock');
    return res.data;
  },

  getByWarehouse: async (warehouseId: string): Promise<InventoryResponse[]> => {
    const res = await axiosClient.get<InventoryResponse[]>(`/stock/${warehouseId}`);
    return res.data;
  },

  // Standalone threshold edit (gateway proxies to PUT /inventory/thresholds).
  // null on either field means "leave the existing value alone".
  updateThresholds: async (body: UpdateThresholdsRequest): Promise<InventoryResponse> => {
    const res = await axiosClient.put<InventoryResponse>('/stock/thresholds', body);
    return res.data;
  },

  // Reduce stock with a consumption record (gateway proxies to
  // POST /inventory/consume, multipart). Backend fields: items (JSON
  // string), purpose, dateOfUsage, description, document (required PDF),
  // proof (optional PDF). The web flow auto-generates `document`
  // client-side via jspdf; mobile takes a user-picked PDF instead — see
  // ARCHITECTURE_FUTURE.md (no jspdf / Buffer in React Native).
  consume: async (req: {
    items:       { productId: string; warehouseId: string; quantity: number }[];
    purpose:     string;
    dateOfUsage: string;
    description: string;
    document:    { uri: string; name: string; mimeType?: string | null };
    proof?:      { uri: string; name: string; mimeType?: string | null } | null;
  }): Promise<void> => {
    const form = new FormData();
    form.append('items',       JSON.stringify(req.items));
    form.append('purpose',     req.purpose);
    form.append('dateOfUsage', req.dateOfUsage);
    form.append('description', req.description);
    form.append('document', {
      uri:  req.document.uri,
      name: req.document.name,
      type: req.document.mimeType ?? 'application/pdf',
    } as unknown as Blob);
    if (req.proof) {
      form.append('proof', {
        uri:  req.proof.uri,
        name: req.proof.name,
        type: req.proof.mimeType ?? 'application/pdf',
      } as unknown as Blob);
    }
    await axiosClient.post('/stock/consume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
