import { axiosClient } from '@/lib/http/client';
import type { CompanyResponse, CreateCompanyRequest, UpdateCompanyRequest } from '@erp/api-types';

export const companiesApi = {
  getAll: async (): Promise<CompanyResponse[]> => {
    const res = await axiosClient.get<CompanyResponse[]>('/companies');
    return res.data;
  },

  getById: async (id: string): Promise<CompanyResponse> => {
    const res = await axiosClient.get<CompanyResponse>(`/companies/${id}`);
    return res.data;
  },

  create: async (body: CreateCompanyRequest): Promise<CompanyResponse> => {
    const res = await axiosClient.post<CompanyResponse>('/companies', body);
    return res.data;
  },

  update: async (id: string, body: UpdateCompanyRequest): Promise<CompanyResponse> => {
    const res = await axiosClient.put<CompanyResponse>(`/companies/${id}`, body);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosClient.delete(`/companies/${id}`);
  },
};
