import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Partner } from '../types/progetto';

export const partnerApi = {
  list: (params: { search?: string; page?: number } = {}) =>
    apiClient.get<PaginatedResponse<Partner>>('/partner', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Partner>>(`/partner/${id}`),

  create: (data: Partial<Partner>) =>
    apiClient.post<ApiResponse<Partner>>('/partner', data),

  update: (id: string, data: Partial<Partner>) =>
    apiClient.patch<ApiResponse<Partner>>(`/partner/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/partner/${id}`),
};
