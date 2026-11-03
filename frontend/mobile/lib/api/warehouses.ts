import { axiosClient } from '@/lib/http/client';
import type {
  WarehouseResponse,
  TotalWarehousesResponse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from '@erp/api-types';

export const warehousesApi = {
  getAll: async (): Promise<WarehouseResponse[]> => {
    const res = await axiosClient.get<WarehouseResponse[]>('/warehouses');
    return res.data;
  },

  getById: async (id: string): Promise<WarehouseResponse> => {
    const res = await axiosClient.get<WarehouseResponse>(`/warehouses/${id}`);
    return res.data;
  },

  // /warehouses/summary → mobile-gateway rewrites to /warehouses/total
  getSummary: async (): Promise<TotalWarehousesResponse> => {
    const res = await axiosClient.get<TotalWarehousesResponse>('/warehouses/summary');
    return res.data;
  },

  create: async (body: CreateWarehouseRequest): Promise<WarehouseResponse> => {
    const res = await axiosClient.post<WarehouseResponse>('/warehouses', body);
    return res.data;
  },

  update: async (id: string, body: UpdateWarehouseRequest): Promise<WarehouseResponse> => {
    const res = await axiosClient.put<WarehouseResponse>(`/warehouses/${id}`, body);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosClient.delete(`/warehouses/${id}`);
  },
};
