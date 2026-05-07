// frontend/src/api/config.ts
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { TipoFinanziamento, Partner } from '../types/progetto';
import type { VoceDiCosto } from '../types/budget';
import type { TemplateTimesheet } from '../types/timesheet';

export const configApi = {
  tipiFinanziamento: () =>
    apiClient.get<ApiResponse<TipoFinanziamento[]>>('/tipi-finanziamento'),

  vociDiCosto: () =>
    apiClient.get<ApiResponse<VoceDiCosto[]>>('/voci-di-costo'),

  partner: () =>
    apiClient.get<ApiResponse<Partner[]>>('/partner'),

  templateTimesheet: () =>
    apiClient.get<ApiResponse<TemplateTimesheet[]>>('/template-timesheet'),
};
