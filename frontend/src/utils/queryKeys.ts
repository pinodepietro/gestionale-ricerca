// frontend/src/utils/queryKeys.ts
// Factory centralizzata per le React Query keys.
// Evita stringhe sparse nel codice e facilita l'invalidazione mirata.

import type { ProgettoFilters } from '../api/progetti';
import type { TimesheetFilters } from '../api/timesheet';

export const queryKeys = {
  progetti: {
    all: ['progetti'] as const,
    list: (filters: ProgettoFilters) => ['progetti', 'list', filters] as const,
    portfolio: ['progetti', 'portfolio'] as const,
    detail: (id: string) => ['progetti', id] as const,
    cruscotto: (id: string) => ['progetti', id, 'cruscotto'] as const,
    documenti: (id: string) => ['progetti', id, 'documenti'] as const,
    allocazioni: (id: string) => ['progetti', id, 'allocazioni'] as const,
    budget: (id: string) => ['progetti', id, 'budget'] as const,
    spese: (id: string, params?: object) => ['progetti', id, 'spese', params] as const,
    impegni: (id: string) => ['progetti', id, 'impegni'] as const,
    partner: (id: string) => ['progetti', id, 'partner'] as const,
  },

  sal: {
    all: ['sal'] as const,
    byProgetto: (progettoId: string) => ['sal', 'progetto', progettoId] as const,
    detail: (id: string) => ['sal', id] as const,
  },

  timesheet: {
    all: ['timesheet'] as const,
    list: (filters: TimesheetFilters) => ['timesheet', 'list', filters] as const,
    detail: (id: string) => ['timesheet', id] as const,
  },

  personale: {
    all: ['persone'] as const,
    list: (params?: object) => ['persone', 'list', params] as const,
    detail: (id: string) => ['persone', id] as const,
    costiOrari: (id: string) => ['persone', id, 'costi-orari'] as const,
    monteOre: (id: string) => ['persone', id, 'monte-ore'] as const,
    monteOreAnno: (id: string, anno: number) => ['persone', id, 'monte-ore', anno] as const,
  },

  config: {
    tipiFinanziamento: ['config', 'tipi-finanziamento'] as const,
    tipiProgetto: ['config', 'tipi-progetto'] as const,
    vociDiCosto: ['config', 'voci-di-costo'] as const,
    partner: ['config', 'partner'] as const,
    templateTimesheet: ['config', 'template-timesheet'] as const,
  },
};
