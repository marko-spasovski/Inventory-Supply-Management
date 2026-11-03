// DTOs mirroring backend response shapes exactly.
// Source of truth: service controllers + mobile-gateway route comments.
//
// TYPES ONLY. Runtime values (e.g. the COUNTRIES/CITIES option arrays, the
// order-status ordinal maps) deliberately do NOT live here — they belong in
// the consuming app or in @erp/domain, because runtime values are unsafe to
// share across the Module Federation boundary.

// OrderStatus is a domain concept (its states + transitions + ordinal mapping
// live in @erp/domain). DTOs that carry a status reference the type here.
import type { OrderStatus } from '@erp/domain';
export type { OrderStatus };

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  id:    string;
  email: string;
  name:  string;
  role:  string;
}

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest {
  name:     string;
  email:    string;
  password: string;
  role:     string;
}

// Decoded JWT payload (jwt-decode output)
export interface JwtPayload {
  sub:    string;   // email
  role:   string;   // 'MANAGER' | 'WORKER'
  userId: string;
  iat:    number;
  exp:    number;
}

// ─── Warehouses ──────────────────────────────────────────────────────────────

// Backend enums (warehouse-service/domain/enums/Country.java & City.java).
// The matching runtime option arrays (COUNTRIES/CITIES) live in the app layer.
export type Country = 'MACEDONIA' | 'SLOVENIA';
export type City = 'MARIBOR' | 'LJUBLJANA' | 'KUMANOVO' | 'SKOPJE';

export interface WarehouseResponse {
  id:            string;
  name:          string;
  country:       Country;
  city:          City;
  totalCapacity: number;
  usedCapacity:  number;
}

// /warehouses/summary returns this shape (mobile-gateway rewrites to /warehouses/total)
export interface TotalWarehousesResponse {
  totalNumberOfWarehouses: number;
}

export interface CreateWarehouseRequest {
  name:          string;
  country:       Country;
  city:          City;
  totalCapacity: number;
}

export interface UpdateWarehouseRequest {
  name:          string;
  country:       Country;
  city:          City;
  totalCapacity: number;
  usedCapacity:  number;
}

// ─── Inventory / Stock ───────────────────────────────────────────────────────

// Mobile-gateway serves /stock/* → downstream /inventory/*
export interface InventoryResponse {
  id:           string;
  productId:    string;
  warehouseId:  string;
  quantity:     number;
  // Gap 13: nullable thresholds. The mobile low-stock badge uses minQuantity
  // when set, else falls back to a UI default (10) for visibility.
  minQuantity?: number | null;
  maxQuantity?: number | null;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface ProductResponse {
  id:          string;
  name:        string;
  sku:         string;
  description: string;
  weight:      number;
  categoryId:  string;
}

export interface CreateProductRequest {
  name:        string;
  sku:         string;
  description: string;
  weight:      number;
  categoryId:  string;
}

export interface UpdateProductRequest {
  name:        string;
  sku:         string;
  description: string;
  weight:      number;
  categoryId:  string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface CategoryResponse {
  id:           string;
  name:         string;
  description?: string;
}

export interface CreateCategoryRequest {
  name:         string;
  description?: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderResponse {
  id:           string;
  productId:    string;
  companyId:    string;
  warehouseId:  string;
  driverId:     string;
  quantity:     number;
  status:       OrderStatus;
  deliveryDate: string | null;
  createdAt:    string;
  lastModified: string;
}

export interface CreateOrderRequest {
  productId:    string;
  companyId:    string;
  warehouseId:  string;
  driverId:     string;
  quantity:     number;
  deliveryDate?: string | null;
}

// ─── Companies ───────────────────────────────────────────────────────────────

export interface CompanyResponse {
  id:      string;
  name:    string;
  email:   string;
  phone:   string;
  contact: string;
}

export interface CreateCompanyRequest {
  name:    string;
  email:   string;
  phone:   string;
  contact: string;
}

export interface UpdateCompanyRequest {
  name:    string;
  email:   string;
  phone:   string;
  contact: string;
}

// ─── Fleet — Drivers ─────────────────────────────────────────────────────────

export interface DriverResponse {
  id:        string;
  name:      string;
  phone:     string;
  email:     string;
  vehicleId: string;
  companyId: string;
}

export interface CreateDriverRequest {
  name:      string;
  phone:     string;
  email:     string;
  vehicleId: string;
  companyId: string;
}

export interface UpdateDriverRequest {
  name:      string;
  phone:     string;
  email:     string;
  vehicleId: string;
  companyId: string;
}

// ─── Fleet — Vehicles ────────────────────────────────────────────────────────
// Backend (fleet-service/Domain/Entities/Vehicle.cs) carries only id +
// registrationPlate today.

export interface VehicleResponse {
  id:                string;
  registrationPlate: string;
}

export interface CreateVehicleRequest {
  registrationPlate: string;
}

export interface UpdateVehicleRequest {
  registrationPlate: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface NotificationResponse {
  id:        string;
  title:     string;
  body:      string;
  severity:  string;
  read:      boolean;
  createdAt: string;
}

// WebSocket message shape (notification-service ws-broadcaster)
export interface WsNotificationMessage {
  type:    string;
  topic?:  string;
  payload?: unknown;
}

// ─── Common ──────────────────────────────────────────────────────────────────

export interface ApiError {
  error:   string;
  message: string;
  status?: number;
}
