import { axiosClient } from '@/lib/http/client';
import type {
  ProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CategoryResponse,
  CreateCategoryRequest,
} from '@erp/api-types';

export const productsApi = {
  getAll: async (): Promise<ProductResponse[]> => {
    const res = await axiosClient.get<ProductResponse[]>('/products');
    return res.data;
  },

  getById: async (id: string): Promise<ProductResponse> => {
    const res = await axiosClient.get<ProductResponse>(`/products/${id}`);
    return res.data;
  },

  // Backend Gap 5 closed: product-service exposes GET /products/by-sku?sku=...
  // Returns null on 404 so callers (scanner) can show "not found" without try/catch.
  getBySku: async (sku: string): Promise<ProductResponse | null> => {
    try {
      const res = await axiosClient.get<ProductResponse>('/products/by-sku', { params: { sku } });
      return res.data;
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 404) return null;
      throw err;
    }
  },

  create: async (body: CreateProductRequest): Promise<void> => {
    await axiosClient.post('/products', body);
  },

  update: async (id: string, body: UpdateProductRequest): Promise<ProductResponse> => {
    const res = await axiosClient.put<ProductResponse>(`/products/${id}`, body);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosClient.delete(`/products/${id}`);
  },

  // Categories
  getAllCategories: async (): Promise<CategoryResponse[]> => {
    const res = await axiosClient.get<CategoryResponse[]>('/categories');
    return res.data;
  },

  createCategory: async (body: CreateCategoryRequest): Promise<CategoryResponse> => {
    const res = await axiosClient.post<CategoryResponse>('/categories', body);
    return res.data;
  },

  updateCategory: async (id: string, body: CreateCategoryRequest): Promise<CategoryResponse> => {
    const res = await axiosClient.put<CategoryResponse>(`/categories/${id}`, body);
    return res.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await axiosClient.delete(`/categories/${id}`);
  },
};
