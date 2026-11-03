import { axiosClient } from '@/lib/http/client';
import type {
  DriverResponse,
  CreateDriverRequest,
  UpdateDriverRequest,
  VehicleResponse,
  CreateVehicleRequest,
  UpdateVehicleRequest,
} from '@erp/api-types';

export const fleetApi = {
  // Drivers
  getAllDrivers: async (): Promise<DriverResponse[]> => {
    const res = await axiosClient.get<DriverResponse[]>('/drivers');
    return res.data;
  },

  getDriverById: async (id: string): Promise<DriverResponse> => {
    const res = await axiosClient.get<DriverResponse>(`/drivers/${id}`);
    return res.data;
  },

  // Gap 3 closed — resolves the driver record by the JWT's email claim.
  // Returns null on 404 so DRIVER role flows can show a friendly empty state.
  getMyDriver: async (): Promise<DriverResponse | null> => {
    try {
      const res = await axiosClient.get<DriverResponse>('/drivers/me');
      return res.data;
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 404) return null;
      throw err;
    }
  },

  createDriver: async (body: CreateDriverRequest): Promise<DriverResponse> => {
    const res = await axiosClient.post<DriverResponse>('/drivers', body);
    return res.data;
  },

  updateDriver: async (id: string, body: UpdateDriverRequest): Promise<DriverResponse> => {
    const res = await axiosClient.put<DriverResponse>(`/drivers/${id}`, body);
    return res.data;
  },

  deleteDriver: async (id: string): Promise<void> => {
    await axiosClient.delete(`/drivers/${id}`);
  },

  // Vehicles
  getAllVehicles: async (): Promise<VehicleResponse[]> => {
    const res = await axiosClient.get<VehicleResponse[]>('/vehicles');
    return res.data;
  },

  getVehicleById: async (id: string): Promise<VehicleResponse> => {
    const res = await axiosClient.get<VehicleResponse>(`/vehicles/${id}`);
    return res.data;
  },

  createVehicle: async (body: CreateVehicleRequest): Promise<VehicleResponse> => {
    const res = await axiosClient.post<VehicleResponse>('/vehicles', body);
    return res.data;
  },

  updateVehicle: async (id: string, body: UpdateVehicleRequest): Promise<VehicleResponse> => {
    const res = await axiosClient.put<VehicleResponse>(`/vehicles/${id}`, body);
    return res.data;
  },

  deleteVehicle: async (id: string): Promise<void> => {
    await axiosClient.delete(`/vehicles/${id}`);
  },
};
